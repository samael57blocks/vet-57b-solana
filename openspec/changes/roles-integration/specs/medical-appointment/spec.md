# Delta for Medical Appointment

## MODIFIED Requirements

### Requirement: Pay for a medical appointment

The system MUST accept payments via `pay_medical_appointment`. The instruction SHALL transition the appointment status from `Unpaid` to `PartiallyPaid` (partial) or `FullyPaid` (full). The cumulative paid amount MUST be tracked in the account. The instruction SHALL validate that `authority == medical_record.owner` — only the pet owner may pay.
(Previously: Any caller could pay)

#### Scenario: Happy path — owner pays in full

- GIVEN an appointment with ID `1` in `Unpaid` status, cost 1 SOL, and `medical_record.owner` matches wallet `A`
- WHEN wallet `A` (the owner) calls `pay_medical_appointment` with 1 SOL
- THEN the appointment status MUST update to `FullyPaid`
- AND the paid amount SHALL reflect the total

#### Scenario: Vet cannot pay — transaction rejected

- GIVEN an appointment with ID `1` owned by wallet `A`
- WHEN wallet `B` (a vet with no OwnerProfile) calls `pay_medical_appointment`
- THEN the transaction MUST fail because `authority != medical_record.owner`

#### Scenario: Partial payment accepted

- GIVEN an appointment with ID `1` in `Unpaid` status, cost 1 SOL, and `medical_record.owner` matches wallet `A`
- WHEN wallet `A` calls `pay_medical_appointment` with 0.5 SOL
- THEN the appointment status MUST update to `PartiallyPaid`
- AND the paid amount SHALL be 0.5 SOL

#### Scenario: Overpayment rejected

- GIVEN an appointment with ID `1` in `Unpaid` status, cost 1 SOL, and `medical_record.owner` matches wallet `A`
- WHEN wallet `A` calls `pay_medical_appointment` with 2 SOL
- THEN the transaction MUST fail with `PaymentExceedsCost`
