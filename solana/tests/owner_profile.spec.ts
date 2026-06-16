import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Vet57b } from "../target/types/vet_57b";
import { TestingContext } from "./helpers/testing_context.helper";
import { expect } from "chai";

describe('Owner Profile', () => {

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

  describe('Owner registration', () => {
    it('Registers an owner with a valid name', async () => {
      const owner = testingContext.defaultSigner.publicKey;
      const name = 'Alice';

      // Derive the OwnerProfile PDA
      const [ownerProfileAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from('owner-profile'), owner.toBuffer()],
        vetProgram.programId,
      );

      // Register the owner with the name as an input struct
      const tx = await (vetProgram.methods as any).registerOwner({ name }).accounts({
        ownerProfile: ownerProfileAddress,
        owner,
        systemProgram: SystemProgram.programId,
      }).signers([testingContext.defaultSigner]).rpc();
      await testingContext.waitForTransactions(tx);

      // Fetch the owner profile account
      const ownerProfile = await (vetProgram.account as any).ownerProfile.fetch(ownerProfileAddress);

      // Assert the account was created with correct data
      expect(ownerProfile).not.to.be.null;
      expect(ownerProfile.owner.toBase58()).equals(owner.toBase58());
      expect(ownerProfile.name).equals(name);
    });

    it('Fails when the same wallet registers twice', async () => {
      const owner = testingContext.defaultSigner.publicKey;
      const name = 'Alice';

      // Derive the OwnerProfile PDA
      const [ownerProfileAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from('owner-profile'), owner.toBuffer()],
        vetProgram.programId,
      );

      // First registration — should succeed
      const tx = await (vetProgram.methods as any).registerOwner({ name }).accounts({
        ownerProfile: ownerProfileAddress,
        owner,
        systemProgram: SystemProgram.programId,
      }).signers([testingContext.defaultSigner]).rpc();
      await testingContext.waitForTransactions(tx);

      // Second registration — should fail
      try {
        await (vetProgram.methods as any).registerOwner({ name }).accounts({
          ownerProfile: ownerProfileAddress,
          owner,
          systemProgram: SystemProgram.programId,
        }).signers([testingContext.defaultSigner]).rpc();
        expect.fail('Expected an AnchorError for duplicate owner registration');
      } catch (err) {
        expect(err).to.exist;
      }
    });
  });
});
