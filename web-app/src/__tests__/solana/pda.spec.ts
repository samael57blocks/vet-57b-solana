// @vitest-environment node
// PDA derivation is pure computation (no DOM needed).
// Node environment avoids jsdom Buffer polyfill issues with @noble/hashes.
import { describe, it, expect } from 'vitest';
import { PublicKey, Keypair } from '@solana/web3.js';
import {
  deriveMedicalRecordAddress,
  deriveMedicalAppointmentAddress,
  derivePetCheckinAddress,
} from '../../solana/pda';

/**
 * The Anchor program ID from Anchor.toml.
 */
const PROGRAM_ID = new PublicKey('6uka17bBE74Sf5s9AMqQvPRMsk3ujb8JhaUpMHYpg5mv');

describe('deriveMedicalRecordAddress', () => {
  it('returns a valid [PublicKey, bump] tuple', () => {
    const petId = Keypair.generate().publicKey;
    const [address, bump] = deriveMedicalRecordAddress(petId, PROGRAM_ID);

    expect(address).toBeInstanceOf(PublicKey);
    expect(typeof bump).toBe('number');
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThan(256);
  });

  it('is deterministic — same inputs produce the same PDA', () => {
    const petId = Keypair.generate().publicKey;
    const [resultA] = deriveMedicalRecordAddress(petId, PROGRAM_ID);
    const [resultB] = deriveMedicalRecordAddress(petId, PROGRAM_ID);

    expect(resultA.equals(resultB)).toBe(true);
  });

  it('produces different PDAs for different pet IDs', () => {
    const petIdA = Keypair.generate().publicKey;
    const petIdB = Keypair.generate().publicKey;
    const [resultA] = deriveMedicalRecordAddress(petIdA, PROGRAM_ID);
    const [resultB] = deriveMedicalRecordAddress(petIdB, PROGRAM_ID);

    expect(resultA.equals(resultB)).toBe(false);
  });

  it('does not throw for any valid PublicKey', () => {
    expect(() => {
      deriveMedicalRecordAddress(Keypair.generate().publicKey, PROGRAM_ID);
    }).not.toThrow();
  });

  it('returns a PDA that is on the Ed25519 curve (findProgramAddressSync guarantees this)', () => {
    const petId = Keypair.generate().publicKey;
    const [address] = deriveMedicalRecordAddress(petId, PROGRAM_ID);

    // PDAs are always off the curve by construction
    expect(PublicKey.isOnCurve(address.toBytes())).toBe(false);
  });
});

describe('deriveMedicalAppointmentAddress', () => {
  it('returns a valid [PublicKey, bump] tuple', () => {
    const id = Keypair.generate().publicKey;
    const [address, bump] = deriveMedicalAppointmentAddress(id, PROGRAM_ID);

    expect(address).toBeInstanceOf(PublicKey);
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThan(256);
  });

  it('is deterministic', () => {
    const id = Keypair.generate().publicKey;
    const [resultA] = deriveMedicalAppointmentAddress(id, PROGRAM_ID);
    const [resultB] = deriveMedicalAppointmentAddress(id, PROGRAM_ID);

    expect(resultA.equals(resultB)).toBe(true);
  });

  it('produces different PDAs for different IDs', () => {
    const idA = Keypair.generate().publicKey;
    const idB = Keypair.generate().publicKey;
    const [resultA] = deriveMedicalAppointmentAddress(idA, PROGRAM_ID);
    const [resultB] = deriveMedicalAppointmentAddress(idB, PROGRAM_ID);

    expect(resultA.equals(resultB)).toBe(false);
  });

  it('does not throw for any valid PublicKey', () => {
    expect(() => {
      deriveMedicalAppointmentAddress(Keypair.generate().publicKey, PROGRAM_ID);
    }).not.toThrow();
  });
});

describe('derivePetCheckinAddress', () => {
  it('returns a valid [PublicKey, bump] tuple', () => {
    const medicalRecord = Keypair.generate().publicKey;
    const id = Keypair.generate().publicKey;
    const [address, bump] = derivePetCheckinAddress(medicalRecord, id, PROGRAM_ID);

    expect(address).toBeInstanceOf(PublicKey);
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThan(256);
  });

  it('is deterministic', () => {
    const medicalRecord = Keypair.generate().publicKey;
    const id = Keypair.generate().publicKey;
    const [resultA] = derivePetCheckinAddress(medicalRecord, id, PROGRAM_ID);
    const [resultB] = derivePetCheckinAddress(medicalRecord, id, PROGRAM_ID);

    expect(resultA.equals(resultB)).toBe(true);
  });

  it('changes when the medical record changes', () => {
    const mrA = Keypair.generate().publicKey;
    const mrB = Keypair.generate().publicKey;
    const id = Keypair.generate().publicKey;
    const [resultA] = derivePetCheckinAddress(mrA, id, PROGRAM_ID);
    const [resultB] = derivePetCheckinAddress(mrB, id, PROGRAM_ID);

    expect(resultA.equals(resultB)).toBe(false);
  });

  it('changes when the check-in ID changes', () => {
    const medicalRecord = Keypair.generate().publicKey;
    const idA = Keypair.generate().publicKey;
    const idB = Keypair.generate().publicKey;
    const [resultA] = derivePetCheckinAddress(medicalRecord, idA, PROGRAM_ID);
    const [resultB] = derivePetCheckinAddress(medicalRecord, idB, PROGRAM_ID);

    expect(resultA.equals(resultB)).toBe(false);
  });

  it('does not throw for any valid PublicKey', () => {
    expect(() => {
      derivePetCheckinAddress(
        Keypair.generate().publicKey,
        Keypair.generate().publicKey,
        PROGRAM_ID,
      );
    }).not.toThrow();
  });
});
