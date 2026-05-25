import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

/**
 * A medical appointment for a Pet in the 57B Vet.
 */
export interface MedicalAppointment {
  /** The ID of the medical appointment */
  id: PublicKey;
  /** The address of the pet's medical record account */
  medicalRecord: PublicKey;
  /** The date of the appointment (unix timestamp) */
  date: BN;
  /** The time of the appointment */
  time: string;
  /** The value of the appointment (in lamports) */
  appointmentValue: BN;
  /** The paid value for the appointment (in lamports) */
  paidValue: BN;
}

/**
 * The information required to create a new medical appointment.
 */
export interface NewMedicalAppointment {
  /** The ID of the medical appointment */
  id: PublicKey;
  /** The address of the pet's medical record account */
  medicalRecord: PublicKey;
  /** The date of the appointment (unix timestamp) */
  date: BN;
  /** The time of the appointment */
  time: string;
  /** The value of the appointment (in lamports) */
  appointmentValue: BN;
}

/**
 * Class definition for the medical appointment account.
 */
export class MedicalAppointment {
  /**
   * Derives the address of the medical appointment account from its ID.
   * Seeds: [b"medical-appointment", id]
   * @param id - The ID of the medical appointment.
   * @param programId - The ID of the program.
   * @returns The address of the medical appointment account.
   */
  static deriveAddress(id: PublicKey, programId: PublicKey): PublicKey {
    const [address] = PublicKey.findProgramAddressSync(
      [Buffer.from('medical-appointment'), id.toBuffer()],
      programId,
    );
    return address;
  }
}
