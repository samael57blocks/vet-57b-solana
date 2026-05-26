import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Vet57b } from "../target/types/vet_57b";
import { TestingContext } from "./helpers/testing_context.helper";
import { givenNewMedicalRecord, givenNewPetCheckin } from "./helpers/data_mothers";
import { MedicalRecord, PetCheckin } from "../app/models";
import { expect } from "chai";

describe('Pet check-in', () => {

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

  describe('New pet check-in', () => {
    it('Records a check-in for a registered pet', async () => {
      // Register a pet first
      const newMedicalRecord = givenNewMedicalRecord();
      const medicalRecordAddress = MedicalRecord.deriveAddress(newMedicalRecord.id, vetProgram.programId);

      const registerTx = await vetProgram.methods.registerPet(newMedicalRecord).accounts({
        medicalRecord: medicalRecordAddress,
        authority: testingContext.defaultSigner.publicKey,
        systemProgram: SystemProgram.programId,
      }).signers([testingContext.defaultSigner]).rpc();
      await testingContext.waitForTransactions(registerTx);

      // Check in the pet
      const newCheckin = givenNewPetCheckin({
        medicalRecord: newMedicalRecord.id,
      });
      const checkinAddress = PetCheckin.deriveAddress(
        medicalRecordAddress,
        newCheckin.id,
        vetProgram.programId,
      );

      const tx = await vetProgram.methods.takePetToVet({
        id: newCheckin.id,
      }).accounts({
        petCheckin: checkinAddress,
        medicalRecord: medicalRecordAddress,
        authority: testingContext.defaultSigner.publicKey,
        systemProgram: SystemProgram.programId,
      }).signers([testingContext.defaultSigner]).rpc();
      await testingContext.waitForTransactions(tx);

      // Assert that the pet check-in account is created
      const checkin = await vetProgram.account.petCheckin.fetch(checkinAddress);
      expect(checkin).not.to.be.null;
      // Assert that the check-in has the correct information
      expect(checkin.id.toBase58()).equals(newCheckin.id.toBase58());
      expect(checkin.medicalRecord.toBase58()).equals(medicalRecordAddress.toBase58());
      // Assert that the check-in timestamp is set (non-zero)
      expect(checkin.checkinTime.gt(new BN(0))).to.be.true;
    });

    it('Fails when the pet is not registered', async () => {
      // Create a check-in referencing a non-existent medical record
      const newCheckin = givenNewPetCheckin();
      const fakeRecordAddress = TestingContext.newKeypair().publicKey;
      const checkinAddress = PetCheckin.deriveAddress(
        fakeRecordAddress,
        newCheckin.id,
        vetProgram.programId,
      );

      try {
        await vetProgram.methods.takePetToVet({
          id: newCheckin.id,
        }).accounts({
          petCheckin: checkinAddress,
          medicalRecord: fakeRecordAddress,
          authority: testingContext.defaultSigner.publicKey,
          systemProgram: SystemProgram.programId,
        }).signers([testingContext.defaultSigner]).rpc();
        expect.fail('Expected an AnchorError for unregistered pet');
      } catch (err) {
        expect(err).to.exist;
      }
    });

    it('Fails when the check-in ID is duplicated', async () => {
      // Register a pet
      const newMedicalRecord = givenNewMedicalRecord();
      const medicalRecordAddress = MedicalRecord.deriveAddress(newMedicalRecord.id, vetProgram.programId);

      const registerTx = await vetProgram.methods.registerPet(newMedicalRecord).accounts({
        medicalRecord: medicalRecordAddress,
        authority: testingContext.defaultSigner.publicKey,
        systemProgram: SystemProgram.programId,
      }).signers([testingContext.defaultSigner]).rpc();
      await testingContext.waitForTransactions(registerTx);

      // Check in the pet (first time)
      const newCheckin = givenNewPetCheckin({
        medicalRecord: newMedicalRecord.id,
      });
      const checkinAddress = PetCheckin.deriveAddress(
        medicalRecordAddress,
        newCheckin.id,
        vetProgram.programId,
      );

      const firstTx = await vetProgram.methods.takePetToVet({
        id: newCheckin.id,
      }).accounts({
        petCheckin: checkinAddress,
        medicalRecord: medicalRecordAddress,
        authority: testingContext.defaultSigner.publicKey,
        systemProgram: SystemProgram.programId,
      }).signers([testingContext.defaultSigner]).rpc();
      await testingContext.waitForTransactions(firstTx);

      // Try to check in again with the same ID
      try {
        await vetProgram.methods.takePetToVet({
          id: newCheckin.id,
        }).accounts({
          petCheckin: checkinAddress,
          medicalRecord: medicalRecordAddress,
          authority: testingContext.defaultSigner.publicKey,
          systemProgram: SystemProgram.programId,
        }).signers([testingContext.defaultSigner]).rpc();
        expect.fail('Expected an AnchorError for duplicate check-in ID');
      } catch (err) {
        expect(err).to.exist;
      }
    });
  });
});
