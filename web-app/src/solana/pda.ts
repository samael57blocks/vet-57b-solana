import { PublicKey } from '@solana/web3.js';

/**
 * Seed prefixes matching the Anchor Rust program seeds exactly.
 */
const encoder = new TextEncoder();
const MEDICAL_RECORD_SEED = encoder.encode('medical-record');
const MEDICAL_APPOINTMENT_SEED = encoder.encode('medical-appointment');
const PET_CHECKIN_SEED = encoder.encode('pet-checkin');

/**
 * Derives the PDA for a MedicalRecord account.
 *
 * Rust seeds: [b"medical-record", input.id.as_ref()]
 *
 * @param petId - The pet's unique identifier (PublicKey matching the Rust `input.id`)
 * @param programId - The Anchor program ID
 * @returns Tuple of [PDA address, bump seed]
 */
export function deriveMedicalRecordAddress(
  petId: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MEDICAL_RECORD_SEED, petId.toBuffer()],
    programId,
  );
}

/**
 * Derives the PDA for a MedicalAppointment account.
 *
 * Rust seeds: [b"medical-appointment", input.id.as_ref()]
 *
 * @param id - The appointment's unique identifier (PublicKey matching the Rust `input.id`)
 * @param programId - The Anchor program ID
 * @returns Tuple of [PDA address, bump seed]
 */
export function deriveMedicalAppointmentAddress(
  id: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MEDICAL_APPOINTMENT_SEED, id.toBuffer()],
    programId,
  );
}

/**
 * Derives the PDA for a PetCheckin account.
 *
 * Rust seeds: [b"pet-checkin", medical_record.key().as_ref(), input.id.as_ref()]
 *
 * @param medicalRecord - The MedicalRecord public key
 * @param id - The check-in's unique identifier (PublicKey matching the Rust `input.id`)
 * @param programId - The Anchor program ID
 * @returns Tuple of [PDA address, bump seed]
 */
export function derivePetCheckinAddress(
  medicalRecord: PublicKey,
  id: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PET_CHECKIN_SEED, medicalRecord.toBuffer(), id.toBuffer()],
    programId,
  );
}
