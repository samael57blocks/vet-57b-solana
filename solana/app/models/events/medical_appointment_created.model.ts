import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

/**
 * Defines the information emitted by the event when a new medical appointment
 * is created for a pet.
 */
export interface MedicalAppointmentCreatedEvent {
    /** The ID of the medical appointment */
    id: PublicKey;
    /** The ID of the pet */
    petId: PublicKey;
    /** The date of the appointment (unix timestamp) */
    date: BN;
    /** The time of the appointment */
    time: string;
    /** The value of the appointment (in dollar cents) */
    appointmentValue: BN;
    /** The paid value for the appointment (in dollar cents) */
    paidValue: BN;
};
