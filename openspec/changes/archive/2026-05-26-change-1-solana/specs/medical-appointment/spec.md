# Medical Appointment Specification

## Purpose

Pets schedule medical appointments with payment tracking. Appointments support a partial-then-full payment flow, recorded on-chain via PDA accounts.

## Requirements

### Requirement: Schedule an appointment for a registered pet

The system MUST create a `MedicalAppointment` account when `schedule_medical_appointment` is invoked. The account SHALL be a PDA derived from seeds `[b"medical-appointment", record.key.as_ref(), appointment_id.to_le_bytes()]`. The caller MUST provide a valid `MedicalRecord` PDA. Duplicate appointment IDs for the same record MUST be rejected.

#### Scenario: Happy path — appointment scheduled

- GIVEN a registered medical record for pet ID `42`
- WHEN the owner calls `schedule_medical_appointment` with a unique appointment ID and reason
- THEN a `MedicalAppointment` account is created with status `Unpaid` and payment amount `0`
- AND a `MedicalAppointmentCreated` event is emitted with the appointment ID and record pubkey

#### Scenario: Appointment for unregistered pet rejected

- GIVEN no medical record exists for pet ID `99`
- WHEN any wallet calls `schedule_medical_appointment` referencing pet ID `99`
- THEN the transaction MUST fail because the `MedicalRecord` account does not exist

#### Scenario: Duplicate appointment ID rejected

- GIVEN an existing appointment with ID `1` for a given medical record
- WHEN the owner calls `schedule_medical_appointment` with appointment ID `1` for the same record
- THEN the transaction MUST fail with `AppointmentAlreadyExists`

### Requirement: Pay for a medical appointment

The system MUST accept payments via `pay_medical_appointment`. The instruction SHALL transition the appointment status from `Unpaid` to `PartiallyPaid` (partial) or `FullyPaid` (full). The cumulative paid amount MUST be tracked in the account.

#### Scenario: Happy path — full payment

- GIVEN an appointment with ID `1` in `Unpaid` status and a cost of 1 SOL
- WHEN the owner calls `pay_medical_appointment` with the appointment PDA and payment of 1 SOL
- THEN the appointment status MUST update to `FullyPaid`
- AND the paid amount SHALL reflect the total

#### Scenario: Partial payment accepted

- GIVEN an appointment with ID `1` in `Unpaid` status and a cost of 1 SOL
- WHEN the owner calls `pay_medical_appointment` with 0.5 SOL
- THEN the appointment status MUST update to `PartiallyPaid`
- AND the paid amount SHALL be 0.5 SOL

#### Scenario: Overpayment rejected

- GIVEN an appointment with ID `1` in `Unpaid` status and a cost of 1 SOL
- WHEN the owner calls `pay_medical_appointment` with 2 SOL
- THEN the transaction MUST fail with `PaymentExceedsCost`
