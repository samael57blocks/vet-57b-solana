# REST API Specification

## Purpose

Read-only REST endpoints for pets, appointments, and checkins.

## Requirements

### Requirement: Pet endpoints

`GET /api/v1/pets` → JSON array (200, empty if none). `GET /api/v1/pets/:id` → object (200) or 404.

#### Scenario: List pets

- GIVEN pets in DB
- WHEN GET /api/v1/pets
- THEN 200 with array (empty if none)

#### Scenario: Get pet by ID

- GIVEN pet `abc`
- WHEN GET /api/v1/pets/abc
- THEN 200 with JSON pet object

#### Scenario: Pet not found

- GIVEN no pet `xyz`
- WHEN GET /api/v1/pets/xyz
- THEN 404 with JSON error

### Requirement: Appointment endpoints

`GET /api/v1/appointments` → array (200), optional `?petId=` filter. `GET /api/v1/appointments/:id` → object (200) or 404.

#### Scenario: List all

- GIVEN appointments in DB
- WHEN GET /api/v1/appointments
- THEN 200 with array

#### Scenario: Filter by petId

- GIVEN appointments for pets A and B
- WHEN GET /api/v1/appointments?petId=A
- THEN only `pet_id = A` returned

#### Scenario: Get by ID

- GIVEN appointment `abc`
- WHEN GET /api/v1/appointments/abc
- THEN 200 with JSON object

#### Scenario: Not found

- GIVEN no appointment `xyz`
- WHEN GET /api/v1/appointments/xyz
- THEN 404

### Requirement: Checkin endpoint

`GET /api/v1/pets/:id/checkins` → array (200, empty if none) or 404 if pet missing.

#### Scenario: Checkins exist

- GIVEN pet `abc` with 3 checkins
- WHEN GET /api/v1/pets/abc/checkins
- THEN 200 with array of 3

#### Scenario: Pet not found

- GIVEN no pet `xyz`
- WHEN GET /api/v1/pets/xyz/checkins
- THEN 404

#### Scenario: No checkins

- GIVEN pet `abc` with 0 checkins
- WHEN GET /api/v1/pets/abc/checkins
- THEN 200 with empty array
