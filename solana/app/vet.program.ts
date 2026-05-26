import { Program, Provider, BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { Vet57b } from "../target/types/vet_57b";
import * as idl from "../target/idl/vet_57b.json";
import {
  MedicalRecord,
  MedicalAppointment,
  PetCheckin,
  NewMedicalRecord,
  NewMedicalAppointment,
  NewPetCheckin,
} from "./models";

export type { Vet57b } from "../target/types/vet_57b";

/**
 * Typed wrapper around the 57B Veterinary program.
 * Provides convenience methods for all 4 instructions with automatic account derivation.
 */
export class VetProgram {
  /** The raw typed Anchor program instance */
  readonly program: Program<Vet57b>;

  constructor(provider: Provider) {
    this.program = new Program<Vet57b>(idl as any, provider);
  }

  // -----------------------------------------------------------------------
  // Instruction Methods
  // -----------------------------------------------------------------------

  /**
   * Register a new pet, creating an on-chain MedicalRecord PDA.
   * @param input - The medical record data.
   * @param signer - The transaction signer and rent payer.
   * @returns The transaction signature.
   */
  async registerPet(
    input: NewMedicalRecord,
    signer: Keypair,
  ): Promise<string> {
    return this.program.methods
      .registerPet(input)
      .accounts({
        medicalRecord: MedicalRecord.deriveAddress(input.id, this.program.programId),
        authority: signer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer])
      .rpc();
  }

  /**
   * Schedule a medical appointment for a registered pet.
   * @param input - The appointment data including the medical record address for PDA derivation.
   * @param signer - The transaction signer and rent payer.
   * @returns The transaction signature.
   */
  async scheduleMedicalAppointment(
    input: NewMedicalAppointment,
    signer: Keypair,
  ): Promise<string> {
    return this.program.methods
      .scheduleMedicalAppointment({
        id: input.id,
        date: input.date,
        time: input.time,
        appointmentValue: input.appointmentValue,
      })
      .accounts({
        medicalAppointment: MedicalAppointment.deriveAddress(input.id, this.program.programId),
        medicalRecord: MedicalRecord.deriveAddress(input.medicalRecord, this.program.programId),
        authority: signer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer])
      .rpc();
  }

  /**
   * Pay for a medical appointment. Supports partial and full payment.
   * @param medicalAppointmentId - The ID of the medical appointment to pay.
   * @param amount - The amount to pay (in lamports).
   * @param signer - The transaction signer.
   * @returns The transaction signature.
   */
  async payMedicalAppointment(
    medicalAppointmentId: PublicKey,
    amount: BN,
    signer: Keypair,
  ): Promise<string> {
    return this.program.methods
      .payMedicalAppointment({ amount })
      .accounts({
        medicalAppointment: MedicalAppointment.deriveAddress(medicalAppointmentId, this.program.programId),
        authority: signer.publicKey,
      })
      .signers([signer])
      .rpc();
  }

  /**
   * Record a pet's arrival at the clinic with an on-chain timestamp.
   * @param input - The check-in data (id, medicalRecord).
   * @param signer - The transaction signer and rent payer.
   * @returns The transaction signature.
   */
  async takePetToVet(
    input: NewPetCheckin,
    signer: Keypair,
  ): Promise<string> {
    return this.program.methods
      .takePetToVet({ id: input.id })
      .accounts({
        petCheckin: PetCheckin.deriveAddress(input.medicalRecord, input.id, this.program.programId),
        medicalRecord: MedicalRecord.deriveAddress(input.medicalRecord, this.program.programId),
        authority: signer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer])
      .rpc();
  }

  // -----------------------------------------------------------------------
  // Account Derivation Helpers
  // -----------------------------------------------------------------------

  /**
   * Derives the address of a medical record PDA from its ID.
   * @param id - The ID of the medical record.
   * @returns The PDA address.
   */
  deriveMedicalRecordAddress(id: PublicKey): PublicKey {
    return MedicalRecord.deriveAddress(id, this.program.programId);
  }

  /**
   * Derives the address of a medical appointment PDA from its ID.
   * @param id - The ID of the medical appointment.
   * @returns The PDA address.
   */
  deriveMedicalAppointmentAddress(id: PublicKey): PublicKey {
    return MedicalAppointment.deriveAddress(id, this.program.programId);
  }

  /**
   * Derives the address of a pet check-in PDA from the medical record and check-in ID.
   * @param medicalRecord - The address of the pet's medical record account.
   * @param id - The ID of the check-in.
   * @returns The PDA address.
   */
  derivePetCheckinAddress(medicalRecord: PublicKey, id: PublicKey): PublicKey {
    return PetCheckin.deriveAddress(medicalRecord, id, this.program.programId);
  }
}
