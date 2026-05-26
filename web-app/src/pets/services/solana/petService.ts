import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import type { Vet57b } from '../../../solana/types/vet_57b';
import { deriveMedicalRecordAddress } from '../../../solana/pda';
import type { Pet, AnimalType } from '../../types/pet';

/**
 * Raw MedicalRecord account data as returned from the Anchor program.
 */
interface MedicalRecordRaw {
  id: PublicKey;
  name: string;
  age: number;
  animalType: { dog: Record<string, never> } | { cat: Record<string, never> };
  caretakerName: string;
  caretakerPhone: string;
  bump: number;
}

/**
 * Converts an Anchor AnimalType enum to the web-app string format.
 */
function anchorAnimalTypeToPetAnimalType(
  animalType: { dog: Record<string, never> } | { cat: Record<string, never> },
): AnimalType {
  return 'dog' in animalType ? 'Dog' as AnimalType : 'Cat' as AnimalType;
}

/**
 * Converts a web-app animal type string to the Anchor AnimalType enum.
 */
function petAnimalTypeToAnchor(
  species: AnimalType,
): { dog: Record<string, never> } | { cat: Record<string, never> } {
  return species === 'Dog' ? { dog: {} } : { cat: {} };
}

/**
 * Fetches all MedicalRecord accounts and maps them to Pet objects.
 *
 * @param program - The typed Anchor Program instance
 * @returns Array of Pet objects
 */
export async function getPets(program: Program<Vet57b>): Promise<Pet[]> {
  const records = await program.account.medicalRecord.all();

  return records.map((item: { publicKey: PublicKey; account: unknown }) => {
    const account = item.account as MedicalRecordRaw;
    return {
      id: account.id.toBase58(),
      name: account.name,
      age: account.age,
      animalType: anchorAnimalTypeToPetAnimalType(account.animalType),
      caretakerName: account.caretakerName,
      caretakerPhone: account.caretakerPhone,
    };
  });
}

/**
 * Fetches a single MedicalRecord account by its on-chain ID.
 *
 * @param program - The typed Anchor Program instance
 * @param petId - The on-chain PublicKey of the pet (as base58 string)
 * @returns The Pet object or null if not found
 */
export async function getPetById(
  program: Program<Vet57b>,
  petId: string,
): Promise<Pet | null> {
  try {
    const publicKey = new PublicKey(petId);
    const [pda] = deriveMedicalRecordAddress(publicKey, program.programId);
    const account = await program.account.medicalRecord.fetch(pda) as MedicalRecordRaw;

    return {
      id: account.id.toBase58(),
      name: account.name,
      age: account.age,
      animalType: anchorAnimalTypeToPetAnimalType(account.animalType),
      caretakerName: account.caretakerName,
      caretakerPhone: account.caretakerPhone,
    };
  } catch {
    return null;
  }
}

/**
 * Parameters for registering a new pet on-chain.
 */
export interface RegisterPetParams {
  /** The pet's name */
  name: string;
  /** The species of animal */
  species: AnimalType;
  /** The pet's age in years */
  age: number;
  /** The caretaker's name */
  caretakerName: string;
  /** The caretaker's phone number */
  caretakerPhone: string;
}

/**
 * Registers a new pet by sending the `registerPet` instruction to the Anchor program.
 *
 * Generates a new Keypair for the pet's on-chain ID, derives the PDA,
 * and submits the transaction using the connected wallet as signer.
 *
 * @param program - The typed Anchor Program instance
 * @param params - The pet registration parameters
 * @returns The transaction signature
 */
export async function registerPet(
  program: Program<Vet57b>,
  params: RegisterPetParams,
): Promise<string> {
  const petId = Keypair.generate().publicKey;
  const [medicalRecordPda] = deriveMedicalRecordAddress(petId, program.programId);

  const authority = program.provider?.publicKey;
  if (!authority) {
    throw new Error('Wallet not connected');
  }

  const txAccounts: Record<string, PublicKey> = {
    medicalRecord: medicalRecordPda,
    authority,
    systemProgram: SystemProgram.programId,
  };

  return program.methods
    .registerPet({
      id: petId,
      name: params.name,
      age: params.age,
      animalType: petAnimalTypeToAnchor(params.species),
      caretakerName: params.caretakerName,
      caretakerPhone: params.caretakerPhone,
    })
    .accounts(txAccounts)
    .rpc();
}
