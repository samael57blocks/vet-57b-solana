import { AnchorProvider, Program, Provider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Vet57b } from "../../target/types/vet_57b";
import * as idl from "../../target/idl/vet_57b.json";

/**
 * Defines the environment for testing proving helper functions to create and track the program entities.
 */
export class TestingContext {
  /** The Solana provider to send transactions */
  readonly provider: Provider;
  /** The connection to the Solana node */
  readonly connection: Connection;

  /** The 57B Veterinary program */
  readonly program: Program<Vet57b>;

  /** The default signer of the testing environment to send operations */
  readonly defaultSigner: Keypair;

  constructor() {
    // Create an ephemeral keypair for the test wallet (no ANCHOR_WALLET needed)
    const walletKeypair = TestingContext.newKeypair();
    this.defaultSigner = walletKeypair;
    // Create a local connection
    this.connection = new Connection("http://127.0.0.1:8899", "confirmed");
    // Create the provider with the ephemeral wallet instead of reading from filesystem
    this.provider = new AnchorProvider(
      this.connection,
      new Wallet(walletKeypair),
      AnchorProvider.defaultOptions(),
    );

    // Load the 57B Veterinary program from the IDL
    this.program = new Program<Vet57b>(idl as any, this.provider);
    // defaultSigner is set above (walletKeypair) — same as the provider wallet
  }

  /**
   * Creates a new random Keypair
   * @returns A new random Keypair
   */
  static newKeypair(): Keypair {
    return Keypair.generate();
  }

  /**
   * Initialize the testing environment by funding the default signer.
   */
  async initialize(): Promise<void> {
    // Fund the default signer
    await this.sendAirdrop([this.defaultSigner]);
  }

  /**
   * Send an airdrop to the given accounts
   * @param accounts - The accounts to send the airdrop to
   * @param amount - The amount of SOL to send
   */
  async sendAirdrop(accounts: Keypair[], amount: number = 5): Promise<void> {
    // Iterate over the accounts and send the airdrop
    for (const account of accounts) {
      const signature = await this.connection.requestAirdrop(account.publicKey, amount * LAMPORTS_PER_SOL);
      // Wait for the airdrop to be confirmed
      const lastBlockHash = await this.connection.getLatestBlockhash();
      await this.connection.confirmTransaction({
        signature,
        ...lastBlockHash,
      }, 'confirmed');
    }
  }

  /**
   * Waits for a transaction to be finalized by the validator node.
   * @param signature - The signature of the transaction to wait for
   */
  async waitForTransactions(signatures: string | string[]): Promise<void> {
    // If the signatures is an array, wait for all the transactions to be confirmed
    if (Array.isArray(signatures)) {
      // Wait for all the transactions to be confirmed
      await Promise.all(signatures.map(async (txSignature) => {
        await this.waitForTransactions(txSignature);
      }));
    } else {
      // Get the latest block hash info
      const lastBlockHash = await this.connection.getLatestBlockhash();
      // Wait fot the transaction to be confirmed
      await this.connection.confirmTransaction({
        signature: signatures,
        ...lastBlockHash,
      }, 'confirmed');
    }
  }

  /**
   * Gets an event from a transaction
   * @param txSignature - The signature of the transaction
   * @param eventIndex - The index of the event to get
   * @returns The event data if it exists
   */
  async getEvent<T>(txSignature: string, eventIndex: number = 0): Promise<T | undefined> {
    // Get the transaction information
    const tx = await this.connection.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    // Get the transaction logs
    const transactionLogs = tx?.meta?.logMessages;
    if (!transactionLogs) {
      return undefined;
    }

    // Decode the event directly from the logs
    const programDataPrefix = 'Program data: ';
    const eventLogs = transactionLogs
      .filter(log => log.startsWith(programDataPrefix))
      .map(log => log.slice(programDataPrefix.length));

    if (eventIndex >= eventLogs.length) {
      return undefined;
    }

    const decoded = this.program.coder.events.decode(eventLogs[eventIndex]);
    return decoded?.data as T | undefined;
  }

  /**
   * Derives the address of a medical record PDA from its id.
   */
  static deriveMedicalRecordAddress(id: PublicKey, programId: PublicKey): PublicKey {
    const [address] = PublicKey.findProgramAddressSync(
      [Buffer.from("medical-record"), id.toBuffer()],
      programId
    );
    return address;
  }
}
