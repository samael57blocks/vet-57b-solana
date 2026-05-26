/**
 * Type of animals that the Vet can treat.
 */
export const AnimalType = {
    DOG: 'Dog',
    CAT: 'Cat',
} as const;

/**
 * Type of animals that the Vet can treat.
 */
export type AnimalType = typeof AnimalType[keyof typeof AnimalType];

/**
 * Defines the structure of a medical record for a Pet
 */
export interface Pet {
    /** The ID of the medical record (on-chain PublicKey as base58) */
    id: string;
    /** The name of the patient */
    name: string;
    /** The age of the patient in years */
    age: number;
    /** The type of animal */
    animalType: AnimalType;

    /** The name of the pet's caretaker */
    caretakerName: string;
    /** The phone number of the pet's caretaker */
    caretakerPhone: string;
}

/**
 * Represents a veterinary appointment on-chain.
 */
export interface Appointment {
    /** The ID of the medical appointment (on-chain PublicKey as base58) */
    id: string;
    /** The ID of the pet's medical record (on-chain PublicKey as base58) */
    petId: string;
    /** The date of the appointment (unix timestamp in seconds) */
    date: number;
    /** The time of the appointment as a string */
    time: string;
    /** The value of the appointment (in lamports) */
    appointmentValue: number;
    /** The paid value for the appointment (in lamports) */
    paidValue: number;
}

/**
 * Represents a pet check-in record on-chain.
 */
export interface CheckIn {
    /** The ID of the check-in (on-chain PublicKey as base58) */
    id: string;
    /** The ID of the pet's medical record (on-chain PublicKey as base58) */
    petId: string;
    /** The timestamp of the check-in (unix timestamp in seconds) */
    checkinTime: number;
}
