import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Vet57b } from "../target/types/vet_57b";
import { TestingContext } from "./helpers/testing_context.helper";
import { givenNewMedicalRecord, givenNewMedicalAppointment } from "./helpers/data_mothers";
import { MedicalRecord, MedicalAppointment, MedicalAppointmentCreatedEvent } from "../app/models";
import { expect } from "chai";

describe('Schedule appointment', () => {

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

  describe('New appointment scheduling', () => {
    it('Schedules an appointment for a registered pet', async () => {
      // Register a pet first
      const newMedicalRecord = givenNewMedicalRecord();
      const medicalRecordAddress = MedicalRecord.deriveAddress(newMedicalRecord.id, vetProgram.programId);

      const registerTx = await vetProgram.methods.registerPet(newMedicalRecord).accounts({
        medicalRecord: medicalRecordAddress,
        authority: testingContext.defaultSigner.publicKey,
        systemProgram: SystemProgram.programId,
      }).signers([testingContext.defaultSigner]).rpc();
      await testingContext.waitForTransactions(registerTx);

      // Schedule an appointment for the registered pet
      const newAppointment = givenNewMedicalAppointment({
        medicalRecord: newMedicalRecord.id,
      });
      const { id, date, time, appointmentValue } = newAppointment;
      const appointmentAddress = MedicalAppointment.deriveAddress(id, vetProgram.programId);

      const tx = await vetProgram.methods.scheduleMedicalAppointment({
        id, date, time, appointmentValue,
      }).accounts({
        medicalAppointment: appointmentAddress,
        medicalRecord: medicalRecordAddress,
        authority: testingContext.defaultSigner.publicKey,
        systemProgram: SystemProgram.programId,
      }).signers([testingContext.defaultSigner]).rpc();
      await testingContext.waitForTransactions(tx);

      // Assert that the medical appointment account is created
      const appointment = await vetProgram.account.medicalAppointment.fetch(appointmentAddress);
      expect(appointment).not.to.be.null;
      // Assert that the appointment has the correct information
      expect(appointment.id.toBase58()).equals(id.toBase58());
      expect(appointment.medicalRecord.toBase58()).equals(medicalRecordAddress.toBase58());
      expect(appointment.date.eq(date)).to.be.true;
      expect(appointment.time).equals(time);
      expect(appointment.appointmentValue.eq(appointmentValue)).to.be.true;
      expect(appointment.paidValue.eq(new BN(0))).to.be.true;

      // Assert that the event was emitted with the correct information
      const event = await testingContext.getEvent<MedicalAppointmentCreatedEvent>(tx);
      expect(event).not.to.be.null;
      expect(event.id.toBase58()).equals(id.toBase58());
      expect(event.petId.toBase58()).equals(medicalRecordAddress.toBase58());
      expect(event.date.eq(date)).to.be.true;
      expect(event.time).equals(time);
      expect(event.appointmentValue.eq(appointmentValue)).to.be.true;
      expect(event.paidValue.eq(new BN(0))).to.be.true;
    });

    it('Fails when the pet is not registered', async () => {
      // Create an appointment referencing a non-existent medical record
      const newAppointment = givenNewMedicalAppointment();
      const { id, date, time, appointmentValue } = newAppointment;
      const appointmentAddress = MedicalAppointment.deriveAddress(id, vetProgram.programId);
      const fakeRecordAddress = TestingContext.newKeypair().publicKey;

      try {
        await vetProgram.methods.scheduleMedicalAppointment({
          id, date, time, appointmentValue,
        }).accounts({
          medicalAppointment: appointmentAddress,
          medicalRecord: fakeRecordAddress,
          authority: testingContext.defaultSigner.publicKey,
          systemProgram: SystemProgram.programId,
        }).signers([testingContext.defaultSigner]).rpc();
        expect.fail('Expected an AnchorError for unregistered pet');
      } catch (err) {
        expect(err).to.exist;
      }
    });

    it('Fails when the appointment ID is duplicated', async () => {
      // Register a pet
      const newMedicalRecord = givenNewMedicalRecord();
      const medicalRecordAddress = MedicalRecord.deriveAddress(newMedicalRecord.id, vetProgram.programId);

      const registerTx = await vetProgram.methods.registerPet(newMedicalRecord).accounts({
        medicalRecord: medicalRecordAddress,
        authority: testingContext.defaultSigner.publicKey,
        systemProgram: SystemProgram.programId,
      }).signers([testingContext.defaultSigner]).rpc();
      await testingContext.waitForTransactions(registerTx);

      // Schedule an appointment
      const newAppointment = givenNewMedicalAppointment({
        medicalRecord: newMedicalRecord.id,
      });
      const { id, date, time, appointmentValue } = newAppointment;
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

      // Try to schedule the same appointment again with the same ID
      try {
        await vetProgram.methods.scheduleMedicalAppointment({
          id, date, time, appointmentValue,
        }).accounts({
          medicalAppointment: appointmentAddress,
          medicalRecord: medicalRecordAddress,
          authority: testingContext.defaultSigner.publicKey,
          systemProgram: SystemProgram.programId,
        }).signers([testingContext.defaultSigner]).rpc();
        expect.fail('Expected an AnchorError for duplicate appointment ID');
      } catch (err) {
        expect(err).to.exist;
      }
    });
  });
});
