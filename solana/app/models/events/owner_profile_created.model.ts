import { PublicKey } from "@solana/web3.js";

/**
 * Defines the information emitted by the event when a new owner profile
 * is created for a pet owner.
 */
export interface OwnerProfileCreatedEvent {
  /** The wallet address of the owner */
  owner: PublicKey;
  /** The display name of the owner */
  name: string;
}
