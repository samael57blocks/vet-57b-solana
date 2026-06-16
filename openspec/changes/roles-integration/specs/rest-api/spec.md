# Delta for REST API

## ADDED Requirements

### Requirement: Owner profile endpoint

`GET /api/v1/owners/:pubkey/profile` → OwnerProfile JSON (200) or 404 if not found.

#### Scenario: Owner found

- GIVEN owner `ABC` with name "Alice" exists in `owner_profiles`
- WHEN GET /api/v1/owners/ABC/profile
- THEN 200 with `{ pubkey: "ABC", name: "Alice" }`

#### Scenario: Owner not found

- GIVEN no owner `XYZ`
- WHEN GET /api/v1/owners/XYZ/profile
- THEN 404 with JSON error

### Requirement: Pet list MUST include owner_id

`GET /api/v1/pets` and `GET /api/v1/pets/:id` SHALL include `owner_id` (text) and `owner_name` (text, nullable) in each pet object.

#### Scenario: Pet response includes owner

- GIVEN pet `abc` with owner `ABC` (name "Alice")
- WHEN GET /api/v1/pets/abc
- THEN 200 with `{ ..., owner_id: "ABC", owner_name: "Alice" }`

### Requirement: Pets filtered by owner

`GET /api/v1/pets` SHOULD support optional `?ownerId=` query parameter to filter by owner.

#### Scenario: Filter by ownerId

- GIVEN pets for owners A and B
- WHEN GET /api/v1/pets?ownerId=A
- THEN only pets with `owner_id = A` returned
