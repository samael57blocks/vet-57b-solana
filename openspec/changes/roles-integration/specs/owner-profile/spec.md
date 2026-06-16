# Owner Profile Specification

## Purpose

Distinguish pet owners (can pay, see own pets) from vets (register pets, schedule appointments) via an on-chain `OwnerProfile` PDA. Wallets with an OwnerProfile are owners; wallets without are treated as vets.

## Requirements

### Requirement: register_owner MUST create an OwnerProfile PDA

The system MUST provide a `register_owner` instruction. The account SHALL be a PDA derived from seeds `[b"owner-profile", owner.key.as_ref()]`. The wallet MUST sign the transaction. OwnerProfile SHALL store the owner wallet pubkey and a user-supplied name (string, max 64 chars). Duplicate registration for the same wallet MUST be rejected.

#### Scenario: Happy path — owner registered successfully

- GIVEN a wallet with sufficient SOL and no existing OwnerProfile
- WHEN the wallet calls `register_owner` with a valid name
- THEN an `OwnerProfile` account is created at the derived PDA
- AND an `OwnerProfileCreated` event is emitted with the owner pubkey and name

#### Scenario: Duplicate registration rejected

- GIVEN an existing OwnerProfile for wallet `A`
- WHEN wallet `A` calls `register_owner` again
- THEN the transaction MUST fail with a custom Anchor error `OwnerProfileAlreadyExists`

### Requirement: OwnerProfile MUST be queryable by wallet

The system MUST allow reading an OwnerProfile by owner wallet pubkey. The PDA derivation MUST be deterministic: `findProgramAddress([b"owner-profile", owner_wallet.key])`.

#### Scenario: Lookup existing OwnerProfile

- GIVEN wallet `A` has an OwnerProfile with name "Alice"
- WHEN a client fetches `program.account.ownerProfile.all()` filtered by `A`
- THEN the returned account SHALL contain `owner: Pubkey(A)` and `name: "Alice"`

#### Scenario: Lookup non-existent OwnerProfile returns empty

- GIVEN wallet `B` has no OwnerProfile
- WHEN a client fetches `program.account.ownerProfile.all()` filtered by `B`
- THEN the result SHALL be an empty array
