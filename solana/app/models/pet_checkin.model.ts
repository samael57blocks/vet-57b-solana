import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

/**
 * A pet check-in record for when a pet arrives at the clinic.
 */
export interface PetCheckin {
  /** The ID of the check-in */
  id: PublicKey;
  /** The address of the pet's medical record account */
  medicalRecord: PublicKey;
  /** The timestamp of the check-in (unix timestamp) */
  checkinTime: BN;
}

/**
 * The information required to create a new pet check-in.
 */
export interface NewPetCheckin {
  /** The ID of the check-in */
  id: PublicKey;
  /** The address of the pet's medical record account */
  medicalRecord: PublicKey;
}

/**
 * Class definition for the pet check-in account.
 */
export class PetCheckin {
  /**
   * Derives the address of the pet check-in account from the medical record and check-in ID.
   * Seeds: [b"pet-checkin", medical_record, id]
   * @param medicalRecord - The address of the pet's medical record account.
   * @param id - The ID of the check-in.
   * @param programId - The ID of the program.
   * @returns The address of the pet check-in account.
   */
  static deriveAddress(
    medicalRecord: PublicKey,
    id: PublicKey,
    programId: PublicKey,
  ): PublicKey {
    const [address] = PublicKey.findProgramAddressSync(
      [Buffer.from('pet-checkin'), medicalRecord.toBuffer(), id.toBuffer()],
      programId,
    );
    return address;
  }
}
