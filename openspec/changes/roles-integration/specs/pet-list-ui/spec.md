# Delta for Pet List UI

## ADDED Requirements

### Requirement: Pet list MUST be role-filtered

If the connected wallet has an OwnerProfile (owner role), the list SHALL filter `MedicalRecord` accounts where `record.owner == wallet.pubkey`. If the wallet has no OwnerProfile (vet role), the list SHALL display ALL `MedicalRecord` accounts.

#### Scenario: Owner sees only their own pets

- GIVEN wallet `A` is connected and has an OwnerProfile
- GIVEN there are 5 `MedicalRecord` accounts: 2 with `owner == A` and 3 with `owner != A`
- WHEN the pet list renders
- THEN it SHALL display exactly 2 pets (those owned by wallet `A`)

#### Scenario: Vet sees all pets

- GIVEN wallet `B` is connected and has NO OwnerProfile
- GIVEN there are 5 `MedicalRecord` accounts on-chain
- WHEN the pet list renders
- THEN it SHALL display all 5 pets without filtering

#### Scenario: Owner with zero pets — empty state with CTA

- GIVEN wallet `A` is connected, has an OwnerProfile, and zero `MedicalRecord` accounts with `owner == A`
- WHEN the pet list loads
- THEN it SHALL display "No pets registered yet"
- AND the CTA SHALL link to "Ask your vet to register your pet" (not the registration form, since owners cannot register)
