# Delta for Wallet Infrastructure

## ADDED Requirements

### Requirement: Application MUST detect OwnerProfile and expose role context

The system MUST provide a `useRole` hook that checks whether the connected wallet has an OwnerProfile on-chain. The hook SHALL return `{ role: "owner" | "vet" | "loading" | "unconnected", ownerProfile: OwnerProfile | null }`. The check SHALL be performed on wallet connect and wallet change. The role SHOULD be available to all components via context.

#### Scenario: Owner detected on connect

- GIVEN a wallet with an existing OwnerProfile
- WHEN the wallet connects
- THEN `useRole` SHALL return `{ role: "owner", ownerProfile: { name, owner } }`
- AND the role SHALL be accessible to child components

#### Scenario: Vet detected on connect

- GIVEN a wallet with NO OwnerProfile
- WHEN the wallet connects
- THEN `useRole` SHALL return `{ role: "vet", ownerProfile: null }`

#### Scenario: Role refreshes on wallet change

- GIVEN the user switches from wallet `A` (owner) to wallet `B` (vet)
- WHEN the wallet change event fires
- THEN `useRole` SHALL re-fetch and return `{ role: "vet" }`

#### Scenario: Loading state while fetching role

- GIVEN the wallet is connected
- WHEN the `OwnerProfile` fetch is in flight
- THEN `useRole` SHALL return `{ role: "loading" }`

### Requirement: Owner signup flow MUST trigger when role is owner-less

If the connected wallet has NO OwnerProfile, the app SHALL show a name input field prompting role setup. The flow SHALL offer two paths: "I'm a vet" (skip, use app as vet) or "I'm a pet owner" (enter name → call `register_owner`). The choice SHALL be persistent for the session.

#### Scenario: New wallet — role selection prompt shown

- GIVEN the wallet is connected and has no OwnerProfile
- WHEN the app detects the role-less wallet
- THEN a prompt SHALL display: "Are you a pet owner or a vet?"
- AND "Pet Owner" SHALL show a text field for name
- AND "Vet" SHALL skip to the app with vet role

#### Scenario: Owner enters name and registers

- GIVEN the wallet is connected with no OwnerProfile
- WHEN the user selects "Pet Owner" and enters a name
- WHEN the user clicks "Register"
- THEN `register_owner` SHALL be called with the entered name
- AND on success, `useRole` SHALL return `{ role: "owner" }`
