import { Program, Provider, BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { Vet57b } from "../target/types/vet_57b";
import * as idl from "../target/idl/vet_57b.json";
import {
  MedicalRecord,
  MedicalAppointment,
  PetCheckin,
  OwnerProfile,
  NewMedicalRecord,
  NewMedicalAppointment,
  NewPetCheckin,
} from "./models";

export type { Vet57b } from "../target/types/vet_57b";

/**
 * Typed wrapper around the 57B Veterinary program.
 * Provides convenience methods for all 5 instructions with automatic account derivation.
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
   * Register a wallet as a pet owner, creating an OwnerProfile PDA.
   * Seeds: [b"owner-profile", owner.key]
   * @param name - The display name of the owner (max 64 chars).
   * @param signer - The wallet to register and transaction signer.
   * @returns The transaction signature.
   */
  async registerOwner(
    name: string,
    signer: Keypair,
  ): Promise<string> {
    const ownerProfile = OwnerProfile.deriveAddress(signer.publicKey, this.program.programId);
    return this.program.methods
      .registerOwner({ name })
      .accounts({
        ownerProfile,
        owner: signer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer])
      .rpc();
  }

  /**
   * Register a new pet, creating an on-chain MedicalRecord PDA.
   * @param input - The medical record data including the owner's public key.
   * @param signer - The transaction signer and rent payer.
   * @returns The transaction signature.
   */
  async registerPet(
    input: NewMedicalRecord,
    signer: Keypair,
  ): Promise<string> {
    return this.program.methods
      .registerPet({
        id: input.id,
        owner: input.owner,
        name: input.name,
        age: input.age,
        animalType: input.animalType,
        caretakerName: input.caretakerName,
        caretakerPhone: input.caretakerPhone,
      })
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
   * Only the pet owner (matching medical_record.owner) can pay.
   * @param medicalAppointmentId - The ID of the medical appointment to pay.
   * @param medicalRecordId - The ID of the pet's medical record (for owner auth check).
   * @param amount - The amount to pay (in lamports).
   * @param signer - The transaction signer (must be the pet owner).
   * @returns The transaction signature.
   */
  async payMedicalAppointment(
    medicalAppointmentId: PublicKey,
    medicalRecordId: PublicKey,
    amount: BN,
    signer: Keypair,
  ): Promise<string> {
    return this.program.methods
      .payMedicalAppointment({ amount })
      .accounts({
        medicalAppointment: MedicalAppointment.deriveAddress(medicalAppointmentId, this.program.programId),
        medicalRecord: MedicalRecord.deriveAddress(medicalRecordId, this.program.programId),
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

  /**
   * Derives the address of an owner profile PDA from the owner's wallet.
   * @param owner - The wallet address of the owner.
   * @returns The PDA address.
   */
  deriveOwnerProfileAddress(owner: PublicKey): PublicKey {
    return OwnerProfile.deriveAddress(owner, this.program.programId);
  }
}
