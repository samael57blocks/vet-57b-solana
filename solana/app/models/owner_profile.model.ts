import { PublicKey } from "@solana/web3.js";

/**
 * An owner profile for a registered pet owner in the 57B Vet.
 * Created via register_owner instruction.
 */
export interface OwnerProfile {
  /** The wallet address of the owner */
  owner: PublicKey;
  /** The display name of the owner (max 64 chars) */
  name: string;
}

/**
 * Class definition for the owner profile account.
 */
export class OwnerProfile {
  /**
   * Derives the address of the owner profile account from the owner's wallet.
   * Seeds: [b"owner-profile", owner.key]
   * @param owner - The wallet address of the owner.
   * @param programId - The ID of the program.
   * @returns The address of the owner profile account.
   */
  static deriveAddress(owner: PublicKey, programId: PublicKey): PublicKey {
    const [address] = PublicKey.findProgramAddressSync(
      [Buffer.from('owner-profile'), owner.toBuffer()],
      programId,
    );
    return address;
  }
}
