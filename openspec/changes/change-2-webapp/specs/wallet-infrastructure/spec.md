# Wallet Infrastructure Specification

## Purpose

Provide a wallet connection layer and Anchor provider so the React tree can sign transactions and interact with the Solana program via a connected wallet.

## Requirements

### Requirement: Application MUST provide wallet connection at the root

The root component MUST wrap the app in a chain of Solana providers: `ConnectionProvider` (RPC endpoint) → `WalletProvider` (wallet-adapter) → `AnchorProvider` (typed `Program`). The provider chain SHALL be configured before any page component renders. The RPC endpoint SHALL be configurable via `VITE_SOLANA_RPC_URL` environment variable.

#### Scenario: Happy path — providers render and context is available

- GIVEN the app starts with a configured `VITE_SOLANA_RPC_URL`
- WHEN the root component renders
- THEN the Solana provider chain SHALL mount without errors
- AND child components SHALL have access to `useAnchorProvider` and `useVetProgram` hooks

#### Scenario: Missing RPC URL — app shows configuration error

- GIVEN `VITE_SOLANA_RPC_URL` is not set
- WHEN the app starts
- THEN the app SHALL display a configuration error message
- AND SHALL NOT attempt to connect to an undefined endpoint

### Requirement: Wallet connect/disconnect with state feedback

The system MUST provide a connect button that detects installed wallets (Phantom, Backpack, Solflare) via `wallet-adapter`. The wallet's public key SHALL be displayed after connection. Auto-disconnect SHALL reset the app to disconnected state.

#### Scenario: Happy path — user connects successfully

- GIVEN the user has a Solana wallet installed
- WHEN the user clicks "Connect Wallet"
- THEN a wallet popup SHALL appear
- WHEN the user approves the connection
- THEN the app SHALL display the connected wallet's truncated public key
- AND the button text SHALL change to "Disconnect"

#### Scenario: No wallet installed — app guides user

- GIVEN the user has no Solana wallet installed
- WHEN the wallet adapter detects zero compatible wallets
- THEN the connect button SHALL display "Install Wallet"
- AND clicking it SHALL open a page or modal explaining how to install a wallet

#### Scenario: User rejects connection — app stays disconnected

- GIVEN the user clicked "Connect Wallet"
- WHEN the user closes the wallet popup or rejects the connection
- THEN the app SHALL remain in disconnected state
- AND SHALL display a non-blocking message: "Connection was cancelled"

#### Scenario: Wallet disconnects — state resets

- GIVEN the user is connected with wallet address `ABC...`
- WHEN the user clicks "Disconnect" or the wallet extension disconnects
- THEN the app SHALL reset to the initial disconnected state
- AND any on-chain data SHOULD be cleared or marked as stale

### Requirement: Wrong network detection MUST warn the user

The system MUST detect when the connected wallet is on the wrong cluster (e.g., mainnet when the app expects devnet). On mismatch, the app SHALL display a persistent warning with a suggestion to switch.

#### Scenario: Wallet on wrong network — warning displayed

- GIVEN the app targets `devnet` and the wallet is connected to `mainnet-beta`
- WHEN the wallet's cluster is detected
- THEN the app SHALL display a yellow warning banner: "Switch wallet to Devnet"
- AND read/write operations SHOULD be disabled until the user switches

#### Scenario: User switches to correct network — warning clears

- GIVEN the warning banner is shown for wrong network
- WHEN the user switches the wallet to `devnet`
- THEN the warning banner SHALL disappear automatically
- AND read/write operations SHALL become available

### Requirement: Anchor provider MUST be typed with the program IDL

The `AnchorProvider` MUST expose a typed `Program<Vet57b>` instance derived from the compiled IDL. The program ID SHALL be configurable via `VITE_PROGRAM_ID` environment variable. The provider SHALL use the wallet's signer for all transactions.

#### Scenario: Typed program instance created

- GIVEN the wallet is connected on the correct network
- WHEN `useVetProgram` is called
- THEN it SHALL return a typed `Program<Vet57b>` instance with methods for all on-chain instructions
- AND the program ID SHALL match `VITE_PROGRAM_ID`

#### Scenario: Wallet disconnects — program is undefined

- GIVEN the wallet was connected and `useVetProgram` returned a valid program
- WHEN the wallet disconnects
- THEN `useVetProgram` SHALL return `null` for the program instance
- AND components MUST handle the `null` case gracefully
