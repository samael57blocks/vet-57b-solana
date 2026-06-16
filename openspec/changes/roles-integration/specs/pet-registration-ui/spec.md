# Delta for Pet Registration UI

## ADDED Requirements

### Requirement: Pet registration MUST be role-aware

The form SHALL be accessible only when the connected wallet has NO OwnerProfile (i.e., the user is a vet). If the wallet has an OwnerProfile, the form SHALL display "Only vets can register pets" and disable submission.

#### Scenario: Vet sees registration form

- GIVEN the connected wallet has no OwnerProfile
- WHEN the user navigates to pet registration
- THEN the full registration form SHALL render
- AND all fields SHALL be editable

#### Scenario: Owner sees disabled form

- GIVEN the connected wallet has an OwnerProfile
- WHEN the user navigates to pet registration
- THEN the form SHALL display "Only vets can register pets"
- AND the submit button SHALL be disabled

### Requirement: Pet registration form MUST include an owner selector

The form SHALL include a dropdown listing all registered OwnerProfiles. The dropdown SHALL display each owner's name and truncated pubkey. The user MUST select an owner before submitting. The owner's pubkey SHALL be passed as the `owner` parameter to `registerPet`.

#### Scenario: Happy path — vet selects owner and registers

- GIVEN the connected wallet is a vet and the form is valid
- WHEN the user selects an owner from the dropdown, fills pet details, and clicks Submit
- THEN the `registerPet` instruction SHALL use the selected owner's pubkey
- AND the transaction SHALL flow through Idle → Pending → Confirmed → Success

#### Scenario: No owners registered — dropdown shows empty state

- GIVEN the connected wallet is a vet
- WHEN there are zero OwnerProfile accounts on-chain
- THEN the owner dropdown SHALL display "No owners registered yet"
- AND the submit button SHALL be disabled

## MODIFIED Requirements

### Requirement: Register pet form MUST validate all fields before submission

The form MUST collect: owner (from dropdown, required), pet name (string, required), species (cat or dog, required), breed (string, required), and birth date (date, required). All fields MUST be validated before the submit button is enabled. Invalid input SHALL display inline error messages.
(Previously: No owner field; species validation was the only pre-submission rule)

#### Scenario: Happy path — form validates and submits

- GIVEN the user is a connected vet with sufficient SOL and at least one registered owner
- WHEN the user selects an owner, fills all required fields with valid data
- THEN the submit button SHALL be enabled
- WHEN the user clicks Submit
- THEN the transaction SHALL enter `Pending` state (wallet approval popup)

#### Scenario: No owner selected — validation error

- GIVEN the user is a connected vet with the form open
- WHEN the user fills pet details but does not select an owner
- WHEN the user clicks Submit
- THEN an inline error SHALL appear: "Select a pet owner"
- AND the transaction SHALL NOT be sent
