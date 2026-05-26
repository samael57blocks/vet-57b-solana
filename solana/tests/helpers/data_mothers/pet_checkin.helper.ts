import { Keypair } from "@solana/web3.js";
import { NewPetCheckin } from "../../../app/models";

/**
 * Creates a NewPetCheckin request based on partial information proved by the developer.
 * @param data - The partial information to create the request.
 * @returns A NewPetCheckin request.
 */
export function givenNewPetCheckin(data?: Partial<NewPetCheckin>): NewPetCheckin {
    // Define the default values
    const defaultValues: NewPetCheckin = {
        id: Keypair.generate().publicKey,
        medicalRecord: Keypair.generate().publicKey,
    };
    // Merge the default values with the provided data
    return Object.assign(defaultValues, data);
}
