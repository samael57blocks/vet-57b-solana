# Delta for Appointment Management UI

## ADDED Requirements

### Requirement: Appointment scheduling MUST be vet-only

The schedule appointment form SHALL be accessible only when the connected wallet has NO OwnerProfile (vet). If the wallet has an OwnerProfile (owner), the form SHALL display "Ask your vet to schedule appointments" and disable submission.

#### Scenario: Vet sees schedule form

- GIVEN the connected wallet is a vet (no OwnerProfile)
- WHEN the user navigates to schedule appointment
- THEN the schedule form SHALL render with the pet dropdown showing all pets

#### Scenario: Owner sees disabled schedule form

- GIVEN the connected wallet is an owner (has OwnerProfile)
- WHEN the user navigates to schedule appointment
- THEN the schedule form SHALL display "Ask your vet to schedule appointments"
- AND submission SHALL be disabled

### Requirement: Payment MUST be owner-only

The "Pay Now" button on appointments SHALL appear only when the connected wallet is an owner (has OwnerProfile) AND `appointment.owner == wallet.pubkey`. Vets SHALL NOT see the Pay button.

#### Scenario: Owner sees Pay button for own appointment

- GIVEN wallet `A` is connected, has an OwnerProfile, and owns an unpaid appointment
- WHEN the appointment list renders
- THEN the unpaid appointment SHALL display a "Pay Now" button

#### Scenario: Vet does not see Pay button

- GIVEN wallet `B` is connected, has no OwnerProfile
- WHEN the appointment list renders with unpaid appointments
- THEN no "Pay Now" button SHALL appear for any appointment

#### Scenario: Owner does not see Pay button on others' appointments

- GIVEN wallet `A` is connected and has an OwnerProfile
- GIVEN an appointment where `record.owner != A`
- WHEN the appointment list renders
- THEN no "Pay Now" button SHALL appear for that appointment

## MODIFIED Requirements

### Requirement: Schedule appointment form MUST require a registered pet

The schedule form MUST allow the vet to select from ALL registered pets (not just their own) and enter a date and reason. The form SHALL validate that a pet is selected before submission. On submit, the system SHALL send a `scheduleMedicalAppointment` transaction.
(Previously: User selected from their own registered pets)

#### Scenario: Happy path — vet schedules appointment for any pet

- GIVEN the user is a connected vet with at least one registered pet in the system
- WHEN the vet selects any pet, enters a date and reason, and clicks Schedule
- THEN the transaction SHALL enter `Pending` (wallet approval)
- WHEN the wallet approves
- THEN the transaction SHALL confirm, and a success message SHALL display
