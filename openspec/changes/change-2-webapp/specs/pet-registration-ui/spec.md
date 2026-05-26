# Pet Registration UI Specification

## Purpose

Provide a form UI that lets the user register a pet on-chain via the `registerPet` instruction, with full transaction state feedback and validation.

## Requirements

### Requirement: Register pet form MUST validate all fields before submission

The form MUST collect: pet name (string, required), species (cat or dog, required), breed (string, required), and birth date (date, required). All fields MUST be validated before the submit button is enabled. Invalid input SHALL display inline error messages.

#### Scenario: Happy path — form validates and submits

- GIVEN the user is connected to a wallet with sufficient SOL
- WHEN the user fills all required fields with valid data
- THEN the submit button SHALL be enabled
- WHEN the user clicks Submit
- THEN the transaction SHALL enter `Pending` state (wallet approval popup)

#### Scenario: Missing required field — validation error displayed

- GIVEN the user has not filled the pet name field
- WHEN the user clicks Submit
- THEN an inline error SHALL appear under the empty field
- AND the transaction SHALL NOT be sent

#### Scenario: Invalid species — validation error displayed

- GIVEN the user enters "bird" in the species field
- WHEN the form validates
- THEN the form SHALL reject the value
- AND display "Species must be cat or dog"

### Requirement: Transaction MUST flow through Idle → Pending → Confirmed → Success/Error

The register pet flow MUST display four distinct states: Idle (form ready), Pending (wallet approval in progress), Confirmed (transaction landed), Success (transaction confirmed with signature) or Error (failure with message). The form SHALL remain disabled during Pending and Confirmed states to prevent double-submission.

#### Scenario: Happy path — full transaction flow succeeds

- GIVEN the form is valid and wallet is connected
- WHEN the user submits
- THEN the UI SHALL show "Approve in wallet..." (Pending)
- WHEN the wallet confirms the popup
- THEN the UI SHALL show "Confirming transaction..." (Confirmed)
- WHEN the transaction lands on-chain
- THEN the UI SHALL show a success banner with the transaction signature
- AND the pet list SHALL update to include the new pet

#### Scenario: User cancels in wallet — returns to Idle

- GIVEN the form is valid and the user clicked Submit
- WHEN the user closes or rejects the wallet approval popup
- THEN the form SHALL return to `Idle` state
- AND all form data SHALL be preserved (no state corruption)

#### Scenario: Insufficient funds — transaction fails with error

- GIVEN the wallet has insufficient SOL for rent + tx fee
- WHEN the user submits the form
- THEN the transaction SHALL fail
- AND the UI SHALL display a clear error: "Insufficient funds. Add SOL to your wallet."
- AND the form SHALL reset to `Idle` state

#### Scenario: Not connected — prompts to connect first

- GIVEN the user is NOT connected to a wallet
- WHEN the user clicks Submit
- THEN the app SHALL show "Connect your wallet first"
- AND SHALL NOT attempt to send the transaction

### Requirement: Confirmation MUST display transaction signature

After a successful registration, the UI SHALL show the transaction signature as a clickable link to the Solana explorer (devnet).

#### Scenario: Success shows explorer link

- GIVEN the transaction succeeded with signature `SIG123`
- WHEN the success banner renders
- THEN the signature SHALL be displayed as a hyperlink to `https://explorer.solana.com/tx/SIG123?cluster=devnet`
