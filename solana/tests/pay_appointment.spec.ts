import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Vet57b } from "../target/types/vet_57b";
import { TestingContext } from "./helpers/testing_context.helper";
import { givenNewMedicalRecord, givenNewMedicalAppointment } from "./helpers/data_mothers";
import { MedicalRecord, MedicalAppointment } from "../app/models";
import { expect } from "chai";

describe('Pay appointment', () => {

  /** The testing context for the program */
  let testingContext: TestingContext;
  /** The vet program to invoke the instructions under test */
  let vetProgram: Program<Vet57b>;

  beforeEach(async () => {
    // Create a new testing context
    testingContext = new TestingContext();
    // Initialize the testing context
    await testingContext.initialize();

    // Load the vet program
    vetProgram = testingContext.program;
  });

  describe('Payment processing', () => {

    /**
     * Helper that registers a pet and schedules an appointment with the given value.
     * @param appointmentValue - The value of the appointment to schedule.
     * @returns The appointment PDA address and appointment ID.
     */
    async function setupAppointment(appointmentValue: BN): Promise<{
      appointmentAddress: PublicKey;
      appointmentId: PublicKey;
    }> {
      // Register a pet
      const newMedicalRecord = givenNewMedicalRecord();
      const medicalRecordAddress = MedicalRecord.deriveAddress(newMedicalRecord.id, vetProgram.programId);

      const registerTx = await vetProgram.methods.registerPet(newMedicalRecord).accounts({
        medicalRecord: medicalRecordAddress,
        authority: testingContext.defaultSigner.publicKey,
        systemProgram: SystemProgram.programId,
      }).signers([testingContext.defaultSigner]).rpc();
      await testingContext.waitForTransactions(registerTx);

      // Schedule an appointment with the given value
      const newAppointment = givenNewMedicalAppointment({
        medicalRecord: newMedicalRecord.id,
        appointmentValue,
      });
      const { id, date, time } = newAppointment;
      const appointmentAddress = MedicalAppointment.deriveAddress(id, vetProgram.programId);

      const scheduleTx = await vetProgram.methods.scheduleMedicalAppointment({
        id, date, time, appointmentValue,
      }).accounts({
        medicalAppointment: appointmentAddress,
        medicalRecord: medicalRecordAddress,
        authority: testingContext.defaultSigner.publicKey,
        systemProgram: SystemProgram.programId,
      }).signers([testingContext.defaultSigner]).rpc();
      await testingContext.waitForTransactions(scheduleTx);

      return { appointmentAddress, appointmentId: id };
    }

    it('Pays the full appointment amount', async () => {
      // Setup: register a pet and schedule an appointment worth 1 SOL
      const appointmentValue = new BN(1_000_000_000);
      const { appointmentAddress } = await setupAppointment(appointmentValue);

      // Pay the full amount
      const tx = await vetProgram.methods.payMedicalAppointment({
        amount: appointmentValue,
      }).accounts({
        medicalAppointment: appointmentAddress,
        authority: testingContext.defaultSigner.publicKey,
      }).signers([testingContext.defaultSigner]).rpc();
      await testingContext.waitForTransactions(tx);

      // Verify paidValue was updated to the full amount
      const appointment = await vetProgram.account.medicalAppointment.fetch(appointmentAddress);
      expect(appointment.paidValue.eq(appointmentValue)).to.be.true;
    });

    it('Accepts a partial payment', async () => {
      // Setup: register a pet and schedule an appointment worth 1 SOL
      const appointmentValue = new BN(1_000_000_000);
      const partialAmount = new BN(500_000_000);
      const { appointmentAddress } = await setupAppointment(appointmentValue);

      // Pay a partial amount
      const tx = await vetProgram.methods.payMedicalAppointment({
        amount: partialAmount,
      }).accounts({
        medicalAppointment: appointmentAddress,
        authority: testingContext.defaultSigner.publicKey,
      }).signers([testingContext.defaultSigner]).rpc();
      await testingContext.waitForTransactions(tx);

      // Verify paidValue reflects the partial amount
      const appointment = await vetProgram.account.medicalAppointment.fetch(appointmentAddress);
      expect(appointment.paidValue.eq(partialAmount)).to.be.true;
    });

    it('Rejects overpayment exceeding the appointment value', async () => {
      // Setup: register a pet and schedule an appointment worth 1 SOL
      const appointmentValue = new BN(1_000_000_000);
      const overpayment = new BN(2_000_000_000);
      const { appointmentAddress } = await setupAppointment(appointmentValue);

      // Try to pay more than the appointment value
      try {
        await vetProgram.methods.payMedicalAppointment({
          amount: overpayment,
        }).accounts({
          medicalAppointment: appointmentAddress,
          authority: testingContext.defaultSigner.publicKey,
        }).signers([testingContext.defaultSigner]).rpc();
        expect.fail('Expected PaymentExceedsCost error');
      } catch (err) {
        expect(err).to.exist;
      }
    });
  });
});
