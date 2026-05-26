import { Program, BN } from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import type { Vet57b } from '../../../solana/types/vet_57b';
import { deriveMedicalAppointmentAddress, deriveMedicalRecordAddress } from '../../../solana/pda';
import type { Appointment } from '../../../pets/types/pet';

/**
 * Raw MedicalAppointment account data as returned from the Anchor program.
 */
interface MedicalAppointmentRaw {
  id: PublicKey;
  medicalRecord: PublicKey;
  date: BN;
  time: string;
  appointmentValue: BN;
  paidValue: BN;
  bump: number;
}

/**
 * Fetches all MedicalAppointment accounts and maps them to Appointment objects.
 *
 * @param program - The typed Anchor Program instance
 * @returns Array of Appointment objects
 */
export async function getAppointments(program: Program<Vet57b>): Promise<Appointment[]> {
  const records = await program.account.medicalAppointment.all();

  return records.map((item: { publicKey: PublicKey; account: unknown }) => {
    const account = item.account as MedicalAppointmentRaw;
    return {
      id: account.id.toBase58(),
      petId: account.medicalRecord.toBase58(),
      date: account.date.toNumber(),
      time: account.time,
      appointmentValue: account.appointmentValue.toNumber(),
      paidValue: account.paidValue.toNumber(),
    };
  });
}

/**
 * Parameters for scheduling a medical appointment on-chain.
 */
export interface ScheduleAppointmentParams {
  /** The pet's medical record PublicKey (as base58 string) */
  petId: string;
  /** The appointment date (unix timestamp in seconds) */
  date: number;
  /** The time of the appointment as a string */
  time: string;
  /** The appointment value in lamports */
  appointmentValue: number;
}

/**
 * Schedules a medical appointment by sending the `scheduleMedicalAppointment` instruction.
 *
 * Generates a new Keypair for the appointment's on-chain ID, derives the PDAs,
 * and submits the transaction using the connected wallet as signer.
 *
 * @param program - The typed Anchor Program instance
 * @param params - The appointment scheduling parameters
 * @returns The transaction signature
 */
export async function scheduleAppointment(
  program: Program<Vet57b>,
  params: ScheduleAppointmentParams,
): Promise<string> {
  const appointmentId = Keypair.generate().publicKey;
  const [appointmentPda] = deriveMedicalAppointmentAddress(appointmentId, program.programId);

  const petPublicKey = new PublicKey(params.petId);
  const [medicalRecordPda] = deriveMedicalRecordAddress(petPublicKey, program.programId);

  const authority = program.provider?.publicKey;
  if (!authority) {
    throw new Error('Wallet not connected');
  }

  const txAccounts: Record<string, PublicKey> = {
    medicalAppointment: appointmentPda,
    medicalRecord: medicalRecordPda,
    authority,
    systemProgram: SystemProgram.programId,
  };

  return program.methods
    .scheduleMedicalAppointment({
      id: appointmentId,
      date: new BN(params.date),
      time: params.time,
      appointmentValue: new BN(params.appointmentValue),
    })
    .accounts(txAccounts)
    .rpc();
}

/**
 * Pays for a medical appointment by sending the `payMedicalAppointment` instruction.
 *
 * @param program - The typed Anchor Program instance
 * @param appointmentId - The on-chain appointment ID (as base58 string)
 * @param amount - The amount to pay in lamports
 * @returns The transaction signature
 */
export async function payAppointment(
  program: Program<Vet57b>,
  appointmentId: string,
  amount: number,
): Promise<string> {
  const appointmentPublicKey = new PublicKey(appointmentId);
  const [appointmentPda] = deriveMedicalAppointmentAddress(appointmentPublicKey, program.programId);

  const authority = program.provider?.publicKey;
  if (!authority) {
    throw new Error('Wallet not connected');
  }

  const txAccounts: Record<string, PublicKey> = {
    medicalAppointment: appointmentPda,
    authority,
  };

  return program.methods
    .payMedicalAppointment({
      amount: new BN(amount),
    })
    .accounts(txAccounts)
    .rpc();
}
