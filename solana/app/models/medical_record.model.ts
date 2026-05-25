import { PublicKey } from "@solana/web3.js";

/**
 * Type of animal that the Vet can treat.
 * Anchor converts IDL to camelCase, so variant names are lowercase: { dog: {} } | { cat: {} }
 */
export type AnimalType = { dog: Record<string, never> } | { cat: Record<string, never> };

/** AnimalType variant for Dog */
export const ANIMAL_DOG: AnimalType = { dog: {} };
/** AnimalType variant for Cat */
export const ANIMAL_CAT: AnimalType = { cat: {} };

/**
 * A medical record for a Pet in the 57B Vet.
 */
export interface MedicalRecord {
  /** The ID of the medical record */
  id: PublicKey;
  /** The name of the patient */
  name: string;
  /** The age of the patient */
  age: number;
  /** The type of animal */
  animalType: AnimalType;

  /** The name of the pet's caretaker */
  caretakerName: string;
  /** The phone number of the pet's caretaker */
  caretakerPhone: string;
};

/**
 * Class definition for the medical record account.
 */
export class MedicalRecord {
  /**
   * Derives the address of the medical record account from the ID of the medical record.
   * @param id - The ID of the medical record.
   * @param programId - The ID of the program.
   * @returns The address of the medical record account.
   */
  static deriveAddress(id: PublicKey, programId: PublicKey): PublicKey {
    const [address] = PublicKey.findProgramAddressSync(
      [Buffer.from('medical-record'), id.toBuffer()],
      programId
    );
    return address;
  }
}

/**
 * The information required to create a new medical record for a Pet in the 57B Vet.
 */
export interface NewMedicalRecord {
  /** The ID of the medical record */
  id: PublicKey;
  /** The name of the patient */
  name: string;
  /** The age of the patient */
  age: number;
  /** The type of animal */
  animalType: AnimalType;

  /** The name of the pet's caretaker */
  caretakerName: string;
  /** The phone number of the pet's caretaker */
  caretakerPhone: string;
};
