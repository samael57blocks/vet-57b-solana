import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import type { BN } from '@coral-xyz/anchor';
import type { Vet57b } from '../../../solana/types/vet_57b';
import { derivePetCheckinAddress, deriveMedicalRecordAddress } from '../../../solana/pda';
import type { CheckIn } from '../../../pets/types/pet';

/**
 * Raw PetCheckin account data as returned from the Anchor program.
 */
interface PetCheckinRaw {
  id: PublicKey;
  medicalRecord: PublicKey;
  checkinTime: BN;
  bump: number;
}

/**
 * Fetches all PetCheckin accounts and maps them to CheckIn objects.
 *
 * @param program - The typed Anchor Program instance
 * @returns Array of CheckIn objects
 */
export async function getCheckIns(program: Program<Vet57b>): Promise<CheckIn[]> {
  const records = await program.account.petCheckin.all();

  return records.map((item: { publicKey: PublicKey; account: unknown }) => {
    const account = item.account as PetCheckinRaw;
    return {
      id: account.id.toBase58(),
      petId: account.medicalRecord.toBase58(),
      checkinTime: account.checkinTime.toNumber(),
    };
  });
}

/**
 * Records a pet check-in by sending the `takePetToVet` instruction.
 *
 * Generates a new Keypair for the check-in's on-chain ID, derives the PDAs,
 * and submits the transaction using the connected wallet as signer.
 *
 * @param program - The typed Anchor Program instance
 * @param petId - The pet's medical record PublicKey (as base58 string)
 * @returns The transaction signature
 */
export async function checkIn(
  program: Program<Vet57b>,
  petId: string,
): Promise<string> {
  const checkinId = Keypair.generate().publicKey;
  const petPublicKey = new PublicKey(petId);
  const [medicalRecordPda] = deriveMedicalRecordAddress(petPublicKey, program.programId);
  const [checkinPda] = derivePetCheckinAddress(medicalRecordPda, checkinId, program.programId);

  const authority = program.provider?.publicKey;
  if (!authority) {
    throw new Error('Wallet not connected');
  }

  const txAccounts: Record<string, PublicKey> = {
    petCheckin: checkinPda,
    medicalRecord: medicalRecordPda,
    authority,
    systemProgram: SystemProgram.programId,
  };

  return program.methods
    .takePetToVet({
      id: checkinId,
    })
    .accounts(txAccounts)
    .rpc();
}
