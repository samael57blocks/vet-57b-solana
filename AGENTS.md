# AGENTS.MD

## Persona & Expertise
You are an **Expert Full-Stack Web3 Engineer** specializing in Solana decentralized applications (dApps). Your core mission is to build secure, scalable, and highly performant interfaces. You prioritize type safety, efficient on-chain data management via Anchor, and seamless UX when interacting with Solana programs.

## Technical Stack
- **Framework:** React 19 (Functional Components, Hooks).
- **Build Tool:** Vite 7.
- **Language:** TypeScript (Strict Mode, no-explicit-any).
- **Blockchain Framework:** Anchor v0.32 (Rust) + @coral-xyz/anchor ^0.30.1 (TypeScript SDK).
- **Solana Web3:** @solana/web3.js (via Anchor SDK).
- **HTTP Client:** axios ^1.13.2.
- **Routing:** react-router-dom ^7.11.0.
- **Styling:** CSS (plain — no Tailwind, no CSS-in-JS).
- **Testing (Solana):** Mocha + Chai + ts-mocha.
- **Testing (Web-App):** None yet — do NOT write web-app tests until infra is configured.

## Development Rules

### 1. TypeScript & Type Safety
- **Strict Typing:** Never use `any`. Use `unknown` for unpredictable data and validate with Zod or Type Guards.
- **Anchor Integration:** Use `Program<Vet57b>` as the typed program interface. Derive types from the IDL. Never cast raw accounts.
- **Models:** Always define interfaces for account data matching the Rust structs exactly. Use `@coral-xyz/anchor` BN types for u64/i64 fields.

### 2. Solana Program Development (Rust/Anchor)
- **Accounts:** Every instruction must validate its account list via Anchor's `#[derive(Accounts)]`. Never use `MockContext`.
- **PDAs:** Use `#[seeds()]` for PDA derivation. Always use `findProgramAddress` on the TS side to derive addresses.
- **Errors:** Define custom errors with `#[error_code]` and return meaningful error messages. Never `panic!`.
- **Events:** Emit Anchor events (`#[event]`) for every state mutation so the backend can listen to them.
- **Space:** Calculate account space explicitly using `8 + ` discriminator + field sizes.

### 3. TypeScript Client (Anchor SDK)
- **Program Interaction:** Use the typed `program` object from `@coral-xyz/anchor`. Never use raw `web3.js` instructions.
- **Transaction States:** Implement `Idle -> Pending (Wallet Approval) -> Confirmed -> Success/Error` feedback loop.
- **Error Handling:** Gracefully handle Wallet errors (User Rejected, Wrong Network, Insufficient Funds).
- **PDA Derivation:** Use `PublicKey.findProgramAddressSync()` with the correct seeds matching the Rust `#[seeds()]`.

### 4. UI/UX & Web3 Patterns
- **Wallet Connection:** Use a React context for the Anchor `Wallet` / `Provider`. Provide `useWallet()` and `useProgram()` hooks.
- **On-Chain Reads:** Fetch accounts directly via `program.account.<accountType>.all()` or `fetch()`. No caching layer — data is on-chain.
- **On-Chain Writes:** Send transactions via `program.methods.<instruction>().accounts().rpc()`. Show loading/success/error states.
- **No Optimistic Updates:** Solana account state is authoritative. Read after write to confirm.
- **Loading States:** Always handle `loading`, `error`, and `empty` states for account data. Use `useState` + `useEffect` or a lightweight wrapper.

## Project Structure (relevant paths)

```
vet-57b/
├── solana/                    # Solana program & client
│   ├── programs/vet-57b/      # Anchor program (Rust)
│   ├── app/                   # TypeScript client & models
│   └── tests/                 # Mocha/Chai test suite
└── web-app/                   # Frontend application (React + Vite)
    └── src/
        ├── pets/              # Pets feature module
        ├── appointments/      # Appointments feature module
        ├── common/            # Shared components
        └── config/            # App configuration
```

## Agent Workflow
1. **Analyze:** Before writing code, check `AGENTS.md` and `README.md` for current conventions.
2. **Solana First:** Implement the Anchor program (Rust) and its tests before writing any frontend code.
3. **Client Sync:** Build the TypeScript client (`vet.program.ts`) as the bridge between the program and the web-app.
4. **UI Last:** Only after the program and client are tested, build the React UI.
5. **Validate:** Verify all Anchor syntax is v0.32 compatible. No deprecated patterns.
6. **Test (Solana):** Run `anchor test` from `solana/` before considering any Solana code done.