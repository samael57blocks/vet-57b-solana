// @vitest-environment node
// Service tests use @solana/web3.js and @coral-xyz/anchor BN which can have
// issues with jsdom Buffer polyfill. Using node environment avoids this.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicKey, Keypair } from '@solana/web3.js';
import { BN, Program } from '@coral-xyz/anchor';

// ---------------------------------------------------------------------------
// Mock the Anchor program
// ---------------------------------------------------------------------------

const mockAll = vi.fn();
const mockFetch = vi.fn();
const mockRpc = vi.fn();

vi.mock('@coral-xyz/anchor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coral-xyz/anchor')>();
  return {
    ...actual,
    Program: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockPetRecord(
  overrides: Partial<{
    id: PublicKey;
    name: string;
    age: number;
    animalType: { dog: Record<string, never> } | { cat: Record<string, never> };
    caretakerName: string;
    caretakerPhone: string;
    bump: number;
  }> = {},
) {
  return {
    publicKey: Keypair.generate().publicKey,
    account: {
      id: Keypair.generate().publicKey,
      name: 'Buddy',
      age: 3,
      animalType: { dog: {} } as { dog: Record<string, never> },
      caretakerName: 'Alice',
      caretakerPhone: '555-0101',
      bump: 255,
      ...overrides,
    },
  };
}

function createProgramStub() {
  const methodsStub = {
    registerPet: vi.fn().mockReturnThis(),
    scheduleMedicalAppointment: vi.fn().mockReturnThis(),
    payMedicalAppointment: vi.fn().mockReturnThis(),
    takePetToVet: vi.fn().mockReturnThis(),
    accounts: vi.fn().mockReturnThis(),
    rpc: mockRpc,
  };

  const programStub = {
    account: {
      medicalRecord: { all: mockAll, fetch: mockFetch },
      medicalAppointment: { all: vi.fn() },
      petCheckin: { all: vi.fn() },
    },
    programId: new PublicKey('GW9yVGbyRmzwxAzNCmYHruT8FAmVLh48ibfdjniHgzx3'),
    provider: {
      publicKey: Keypair.generate().publicKey,
    },
    methods: methodsStub as unknown as Program<any>['methods'],
  };

  return { programStub, methodsStub };
}

// ---------------------------------------------------------------------------
// petSolanaService tests
// ---------------------------------------------------------------------------

describe('petSolanaService', () => {
  let programStub: ReturnType<typeof createProgramStub>['programStub'];

  beforeEach(() => {
    vi.clearAllMocks();
    programStub = createProgramStub().programStub;
  });

  describe('getPets', () => {
    it('returns correctly mapped pets from on-chain records', async () => {
      const { getPets } = await import('../../pets/services/solana/petService');

      mockAll.mockResolvedValue([
        createMockPetRecord({ name: 'Buddy', age: 3, animalType: { dog: {} } }),
        createMockPetRecord({ name: 'Max', age: 2, animalType: { dog: {} } }),
      ]);

      const pets = await getPets(programStub as unknown as Program<any>);

      expect(pets).toHaveLength(2);
      expect(pets[0].name).toBe('Buddy');
      expect(pets[0].age).toBe(3);
      expect(pets[0].animalType).toBe('Dog');
      expect(pets[1].name).toBe('Max');
      expect(pets[1].animalType).toBe('Dog');
    });

    it('handles Cat animalType correctly', async () => {
      const { getPets } = await import('../../pets/services/solana/petService');

      mockAll.mockResolvedValue([
        createMockPetRecord({ name: 'Bella', animalType: { cat: {} } }),
      ]);

      const pets = await getPets(programStub as unknown as Program<any>);
      expect(pets[0].animalType).toBe('Cat');
    });

    it('returns empty array when no pets exist', async () => {
      const { getPets } = await import('../../pets/services/solana/petService');

      mockAll.mockResolvedValue([]);

      const pets = await getPets(programStub as unknown as Program<any>);
      expect(pets).toEqual([]);
    });

    it('converts PublicKey ids to base58 strings', async () => {
      const { getPets } = await import('../../pets/services/solana/petService');

      const id = Keypair.generate().publicKey;
      mockAll.mockResolvedValue([createMockPetRecord({ id })]);

      const pets = await getPets(programStub as unknown as Program<any>);
      expect(pets[0].id).toBe(id.toBase58());
    });

    it('throws when RPC fails', async () => {
      const { getPets } = await import('../../pets/services/solana/petService');

      mockAll.mockRejectedValue(new Error('RPC connection refused'));

      await expect(getPets(programStub as unknown as Program<any>)).rejects.toThrow(
        'RPC connection refused',
      );
    });
  });

  describe('registerPet', () => {
    it('sends registerPet transaction and returns signature', async () => {
      const { registerPet } = await import('../../pets/services/solana/petService');

      const expectedSignature = 'mock-signature-123';
      mockRpc.mockResolvedValue(expectedSignature);

      const signature = await registerPet(
        programStub as unknown as Program<any>,
        {
          name: 'Buddy',
          species: 'Dog',
          age: 3,
          caretakerName: 'Alice',
          caretakerPhone: '555-0101',
        },
      );

      expect(signature).toBe(expectedSignature);
      expect(programStub.methods.registerPet).toHaveBeenCalledOnce();
      expect(mockRpc).toHaveBeenCalled();
    });

    it('throws when wallet is not connected', async () => {
      const { registerPet } = await import('../../pets/services/solana/petService');

      const disconnectedProgram = {
        ...programStub,
        provider: null,
      };

      await expect(
        registerPet(
          disconnectedProgram as unknown as Program<any>,
          {
            name: 'Buddy',
            species: 'Dog',
            age: 3,
            caretakerName: '',
            caretakerPhone: '',
          },
        ),
      ).rejects.toThrow('Wallet not connected');
    });

    it('throws when RPC fails during registration', async () => {
      const { registerPet } = await import('../../pets/services/solana/petService');

      mockRpc.mockRejectedValue(new Error('Insufficient funds'));

      await expect(
        registerPet(
          programStub as unknown as Program<any>,
          {
            name: 'Buddy',
            species: 'Dog',
            age: 3,
            caretakerName: 'Alice',
            caretakerPhone: '555-0101',
          },
        ),
      ).rejects.toThrow('Insufficient funds');
    });
  });

  describe('getPetById', () => {
    it('returns a pet when found', async () => {
      const { getPetById } = await import('../../pets/services/solana/petService');

      const id = Keypair.generate().publicKey;
      mockFetch.mockResolvedValue({
        id,
        name: 'Buddy',
        age: 3,
        animalType: { dog: {} },
        caretakerName: 'Alice',
        caretakerPhone: '555-0101',
        bump: 255,
      });

      const pet = await getPetById(programStub as unknown as Program<any>, id.toBase58());
      expect(pet).not.toBeNull();
      expect(pet!.name).toBe('Buddy');
    });

    it('returns null when pet is not found', async () => {
      const { getPetById } = await import('../../pets/services/solana/petService');

      mockFetch.mockRejectedValue(new Error('Account not found'));

      const pet = await getPetById(
        programStub as unknown as Program<any>,
        Keypair.generate().publicKey.toBase58(),
      );
      expect(pet).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// appointmentSolanaService tests
// ---------------------------------------------------------------------------

describe('appointmentSolanaService', () => {
  let programStub: ReturnType<typeof createProgramStub>['programStub'];

  beforeEach(() => {
    vi.clearAllMocks();
    programStub = createProgramStub().programStub;
  });

  describe('getAppointments', () => {
    it('returns mapped appointments with BN conversion', async () => {
      const { getAppointments } = await import(
        '../../appointments/services/solana/appointmentService'
      );

      const mockApptAll = vi.fn().mockResolvedValue([
        {
          publicKey: Keypair.generate().publicKey,
          account: {
            id: Keypair.generate().publicKey,
            medicalRecord: Keypair.generate().publicKey,
            date: new BN(1715000000),
            time: '10:00',
            appointmentValue: new BN(1000000000),
            paidValue: new BN(500000000),
            bump: 255,
          },
        },
      ]);
      programStub.account.medicalAppointment.all = mockApptAll;

      const appointments = await getAppointments(programStub as unknown as Program<any>);

      expect(appointments).toHaveLength(1);
      expect(appointments[0].date).toBe(1715000000);
      expect(appointments[0].time).toBe('10:00');
      expect(appointments[0].appointmentValue).toBe(1000000000);
      expect(appointments[0].paidValue).toBe(500000000);
    });
  });

  describe('scheduleAppointment', () => {
    it('sends scheduleMedicalAppointment and returns signature', async () => {
      const { scheduleAppointment } = await import(
        '../../appointments/services/solana/appointmentService'
      );

      mockRpc.mockResolvedValue('schedule-sig');

      const signature = await scheduleAppointment(
        programStub as unknown as Program<any>,
        { petId: Keypair.generate().publicKey.toBase58(), date: 1715000000, time: '10:00', appointmentValue: 1000000000 },
      );

      expect(signature).toBe('schedule-sig');
      expect(mockRpc).toHaveBeenCalled();
    });
  });

  describe('payAppointment', () => {
    it('sends payMedicalAppointment and returns signature', async () => {
      const { payAppointment } = await import(
        '../../appointments/services/solana/appointmentService'
      );

      mockRpc.mockResolvedValue('pay-sig');

      const signature = await payAppointment(
        programStub as unknown as Program<any>,
        Keypair.generate().publicKey.toBase58(),
        500000000,
      );

      expect(signature).toBe('pay-sig');
      expect(mockRpc).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// checkinSolanaService tests
// ---------------------------------------------------------------------------

describe('checkinSolanaService', () => {
  let programStub: ReturnType<typeof createProgramStub>['programStub'];

  beforeEach(() => {
    vi.clearAllMocks();
    programStub = createProgramStub().programStub;
  });

  describe('getCheckIns', () => {
    it('returns mapped check-ins with BN conversion', async () => {
      const { getCheckIns } = await import(
        '../../appointments/services/solana/checkinService'
      );

      const mockCheckinAll = vi.fn().mockResolvedValue([
        {
          publicKey: Keypair.generate().publicKey,
          account: {
            id: Keypair.generate().publicKey,
            medicalRecord: Keypair.generate().publicKey,
            checkinTime: new BN(1715000000),
            bump: 255,
          },
        },
      ]);
      programStub.account.petCheckin.all = mockCheckinAll;

      const checkins = await getCheckIns(programStub as unknown as Program<any>);

      expect(checkins).toHaveLength(1);
      expect(checkins[0].checkinTime).toBe(1715000000);
    });
  });

  describe('checkIn', () => {
    it('sends takePetToVet and returns signature', async () => {
      const { checkIn } = await import(
        '../../appointments/services/solana/checkinService'
      );

      mockRpc.mockResolvedValue('checkin-sig');

      const signature = await checkIn(
        programStub as unknown as Program<any>,
        Keypair.generate().publicKey.toBase58(),
      );

      expect(signature).toBe('checkin-sig');
      expect(mockRpc).toHaveBeenCalled();
    });
  });
});
