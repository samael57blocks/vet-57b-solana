# Pet Check-in UI Specification

## Purpose

Allow users to record a pet's arrival at the clinic on-chain via the `takePetToVet` instruction and view check-in timestamps.

## Requirements

### Requirement: Check-in MUST select a registered pet and record arrival

The check-in UI MUST present a list of the user's registered pets. When the user selects a pet and confirms check-in, the system SHALL send a `takePetToVet` transaction. A unique check-in ID SHALL be generated client-side (e.g., timestamp-based).

#### Scenario: Happy path — check-in recorded successfully

- GIVEN the user is connected and has registered pets
- WHEN the user selects a pet and clicks "Check In"
- THEN the transaction SHALL enter `Pending` → `Confirmed` → `Success`
- AND a confirmation SHALL display the check-in timestamp
- AND the check-in record SHALL appear in the pet's activity log

#### Scenario: No registered pets — action disabled

- GIVEN the user is connected but has zero registered pets
- WHEN the check-in UI renders
- THEN it SHALL display "Register a pet before checking in"
- AND the check-in button SHALL be disabled

### Requirement: Check-in timestamp MUST be displayed after success

After a successful check-in transaction, the UI SHALL display the block timestamp returned from the on-chain `PetCheckin` account.

#### Scenario: Timestamp shown in activity log

- GIVEN the check-in transaction succeeded with slot timestamp `T`
- WHEN the success confirmation renders
- THEN the timestamp SHALL be displayed in human-readable date/time format
- AND the activity log SHALL show "Checked in at {time}"

### Requirement: Duplicate check-in MUST show program error

If a check-in with the same ID already exists, the system SHALL surface the on-chain `CheckinAlreadyExists` error to the user.

#### Scenario: Duplicate check-in — error displayed

- GIVEN a check-in already exists for the selected pet with the generated ID
- WHEN the user submits the check-in
- THEN the transaction SHALL fail
- AND the UI SHALL display "This pet was already checked in"
- AND the form SHALL return to `Idle` state

### Requirement: Transaction feedback SHALL follow Idle-Pending-Confirmed-Success/Error

The check-in flow MUST display the same four-state transaction feedback pattern as other write operations: Idle (form ready), Pending (wallet approval), Confirmed (tx landed), Success (timestamp displayed) or Error (failure message).

#### Scenario: User cancels check-in — returns to Idle

- GIVEN the user selected a pet and clicked Check In
- WHEN the user rejects the wallet popup
- THEN the UI SHALL return to `Idle` state
- AND the selected pet SHALL remain selected
