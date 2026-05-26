# Pet List UI Specification

## Purpose

Display all on-chain `MedicalRecord` accounts owned by the connected wallet, with loading, empty, and error states.

## Requirements

### Requirement: Pet list MUST fetch MedicalRecord accounts for connected owner

When the wallet is connected, the system MUST call `program.account.medicalRecord.all()` filtered by the connected wallet's public key. The list SHALL display each pet's name, species, breed, and registration timestamp.

#### Scenario: Happy path — pets load and display

- GIVEN the wallet is connected and owns 3 `MedicalRecord` accounts
- WHEN the pet list component mounts
- THEN a loading skeleton SHALL display while fetching
- WHEN the data loads
- THEN the list SHALL show 3 pets with name, species, breed, and timestamp
- AND each entry SHALL display the registration timestamp in human-readable format

#### Scenario: Loading state — skeleton displayed

- GIVEN the wallet is connected
- WHEN the RPC call is in flight
- THEN the UI SHALL display a loading skeleton (not a spinner) for each expected row
- AND the list SHALL NOT render partial or empty data

#### Scenario: Empty state — CTA to register first pet

- GIVEN the wallet is connected but has zero `MedicalRecord` accounts
- WHEN the data loads with an empty array
- THEN the UI SHALL display "No pets registered yet"
- AND show a "Register your first pet" call-to-action button
- AND the CTA SHALL navigate to the registration form

#### Scenario: Network error — error with retry

- GIVEN the wallet is connected
- WHEN the RPC call fails (timeout, network down)
- THEN the UI SHALL display "Failed to load pets" with the error message
- AND SHALL include a "Retry" button
- WHEN the user clicks Retry
- THEN the fetch SHALL re-attempt

### Requirement: Pet list MUST refresh when wallet changes

When the user switches wallets or disconnects, the list SHALL reset and refetch for the new owner. When no wallet is connected, the list SHALL show a "Connect wallet to see your pets" message.

#### Scenario: Wallet switches — list refreshes for new owner

- GIVEN the user is connected as wallet `A` and sees pet list for `A`
- WHEN the user disconnects and connects as wallet `B`
- THEN the list SHALL clear
- AND refetch `MedicalRecord` accounts for wallet `B`

#### Scenario: No wallet connected — prompt to connect

- GIVEN no wallet is connected
- WHEN the pet list component renders
- THEN it SHALL display "Connect wallet to see your pets"
- AND SHALL NOT attempt any RPC call
