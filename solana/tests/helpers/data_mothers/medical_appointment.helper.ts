import { BN } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { NewMedicalAppointment } from "../../../app/models";

/**
 * Creates a NewMedicalAppointment request based on partial information proved by the developer.
 * @param data - The partial information to create the request.
 * @returns A NewMedicalAppointment request.
 */
export function givenNewMedicalAppointment(data?: Partial<NewMedicalAppointment>): NewMedicalAppointment {
    // Define the default values
    const defaultValues: NewMedicalAppointment = {
        id: Keypair.generate().publicKey,
        medicalRecord: Keypair.generate().publicKey,
        date: new BN(1715000000),   // Unix timestamp for a default date
        time: '10:00',
        appointmentValue: new BN(1000000000), // 1 SOL in lamports
    };
    // Merge the default values with the provided data
    return Object.assign(defaultValues, data);
}
