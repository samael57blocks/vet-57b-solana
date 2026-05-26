# Appointment Management UI Specification

## Purpose

Enable users to schedule, view, and pay for veterinary appointments on-chain via `scheduleMedicalAppointment` and `payMedicalAppointment` instructions.

## Requirements

### Requirement: Schedule appointment form MUST require a registered pet

The schedule form MUST allow the user to select from their registered pets and enter a date and reason. The form SHALL validate that a pet is selected before submission. On submit, the system SHALL send a `scheduleMedicalAppointment` transaction.

#### Scenario: Happy path — appointment scheduled successfully

- GIVEN the user is connected, has at least one registered pet, and has sufficient SOL
- WHEN the user selects a pet, enters a date and reason, and clicks Schedule
- THEN the transaction SHALL enter `Pending` (wallet approval)
- WHEN the wallet approves
- THEN the transaction SHALL confirm, and a success message SHALL display
- AND the appointment list SHALL include the new appointment

#### Scenario: No pet selected — validation error

- GIVEN the user opened the schedule form
- WHEN the user clicks Schedule without selecting a pet
- THEN an inline error SHALL display: "Select a pet first"
- AND the transaction SHALL NOT be sent

#### Scenario: Duplicate appointment — on-chain error displayed

- GIVEN an appointment already exists for the selected pet with the same ID
- WHEN the user submits the form
- THEN the transaction SHALL fail with `AppointmentAlreadyExists`
- AND the UI SHALL display the error message from the program

#### Scenario: No registered pets — form disabled

- GIVEN the user is connected but has zero registered pets
- WHEN the schedule form renders
- THEN it SHALL display "Register a pet first to schedule appointments"
- AND the submit button SHALL be disabled

### Requirement: Appointment list MUST show status and payment info

The appointment list SHALL display each appointment's pet name, date, reason, status (Unpaid/PartiallyPaid/FullyPaid), and paid amount. The list SHALL fetch `MedicalAppointment` accounts for all of the owner's registered pets.

#### Scenario: Happy path — appointments display with status

- GIVEN the user has 2 appointments (one Unpaid, one FullyPaid)
- WHEN the appointment list loads
- THEN each entry SHALL show pet name, date, reason, and status badge
- AND the unpaid appointment SHALL display a "Pay Now" button

#### Scenario: Empty list — no appointments message

- GIVEN the user is connected and has registered pets
- WHEN the user has zero appointments
- THEN the list SHALL display "No appointments scheduled"

#### Scenario: RPC error — retry available

- GIVEN the user is connected
- WHEN fetching appointments fails due to network error
- THEN the UI SHALL display an error with a "Retry" button

### Requirement: Pay appointment MUST send SOL and update status

For unpaid or partially paid appointments, the user MUST be able to pay. The system SHALL send a `payMedicalAppointment` transaction with the specified SOL amount. The UI SHALL enforce that payment does not exceed the remaining balance.

#### Scenario: Happy path — full payment confirmed

- GIVEN an appointment with cost 1 SOL and status `Unpaid`
- WHEN the user clicks "Pay Now" and confirms the full amount
- THEN the transaction SHALL enter `Pending` → `Confirmed` → `Success`
- AND the appointment status SHALL update to `FullyPaid`

#### Scenario: Partial payment accepted

- GIVEN an appointment with cost 1 SOL and status `Unpaid`
- WHEN the user enters 0.5 SOL and submits payment
- THEN the transaction SHALL succeed
- AND the status SHALL update to `PartiallyPaid`

#### Scenario: Overpayment prevented

- GIVEN an appointment with cost 1 SOL and status `Unpaid`
- WHEN the user enters 2 SOL
- THEN the UI SHALL validate and show "Payment exceeds remaining balance"
- AND SHALL NOT send the transaction

#### Scenario: Payment rejected by wallet — state preserved

- GIVEN the user clicked Pay for an appointment
- WHEN the user rejects the wallet popup
- THEN the appointment list SHALL remain unchanged
- AND no state corruption SHALL occur
