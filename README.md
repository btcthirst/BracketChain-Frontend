# BracketChain Frontend

> Trustless tournament infrastructure powered by Solana smart contracts.

## Overview

BracketChain is a decentralized tournament platform that enables organizers to create on-chain tournaments with trustless prize distribution. Players join by signing Solana transactions, results are reported on-chain, and winners receive instant payouts — no intermediaries.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI + MUI v7 |
| Animations | Motion (`motion/react`) |
| Blockchain | Solana — `@solana/kit` + `@solana/compat` + `@bracketchain/sdk` 0.4.0 (Kit + Codama edition) |
| Wallet adapter | `@solana/wallet-adapter-react` + Wallet Standard auto-discovery (Phantom, Solflare) |
| Testing | Jest + ts-jest |
| Package Manager | pnpm 10 |
| Deployment | Vercel |

## Project Structure

```
bracketchain-frontend/
├── app/                        # Next.js App Router
│   ├── create/                 # /create — tournament creation wizard
│   ├── dashboard/              # /dashboard — organizer dashboard
│   ├── t/[id]/                 # /t/:id — public tournament view
│   ├── explore/                # /explore — tournament browser
│   ├── about/                  # /about — placeholder
│   ├── layout.tsx
│   └── page.tsx                # Landing page
│
├── components/                 # Shared UI components
│   ├── ui/                     # shadcn/ui primitives
│   ├── Navbar.tsx
│   ├── Hero.tsx
│   ├── StatsBar.tsx
│   ├── HowItWorks.tsx
│   ├── LiveTournaments.tsx
│   ├── AnimatedCounter.tsx
│   ├── ForDevelopers.tsx
│   ├── Footer.tsx
│   ├── ConnectButton.tsx
│   └── Providers.tsx           # Solana wallet context
│
├── features/
│   ├── dashboard/              # Organizer dashboard
│   │   ├── DashboardPage.tsx   # Page shell — wallet gate, tabs
│   │   ├── TournamentTable.tsx # Table of owned tournaments
│   │   ├── ManageView.tsx      # Per-tournament management panel
│   │   └── AnalyticsSection.tsx
│   ├── explore/                # Tournament browser
│   │   ├── ExplorePage.tsx
│   │   └── components/
│   │       ├── FilterBar.tsx
│   │       └── TournamentCard.tsx
│   └── tournament/             # Tournament feature module
│       ├── create/
│       │   └── CreateTournament.tsx  # 3-step creation wizard
│       ├── view/
│       │   ├── TournamentPage.tsx    # /t/[id] page shell
│       │   ├── TournamentHeader.tsx  # Name, badges, info strip, share
│       │   ├── BracketView.tsx       # SE/DE bracket tree + match modal
│       │   ├── RoundRobinBracket.tsx # Round Robin standings view
│       │   ├── SwissBracket.tsx      # Swiss bracket view
│       │   ├── TournamentSidebar.tsx # Participants, escrow, actions
│       │   ├── ReportResultModal.tsx
│       │   └── CancelModal.tsx
│       ├── steps/                    # Create wizard steps
│       │   ├── DetailsStep.tsx
│       │   ├── PrizeStep.tsx
│       │   ├── ConfirmStep.tsx
│       │   ├── Stepper.tsx
│       │   ├── FieldGroup.tsx
│       │   ├── BalanceWarning.tsx
│       │   ├── DuplicateNameWarning.tsx
│       │   └── ValidateState.ts
│       └── utils/utils.ts
│
├── hooks/                      # Custom React hooks
│   ├── useWalletBalance.ts     # SOL + USDC balance fetcher
│   ├── useStats.ts             # Landing page stats
│   ├── useTournaments.ts       # Live tournaments list
│   ├── useTournamentView.ts    # Single tournament detail
│   ├── useDashboard.ts         # Dashboard data
│   ├── useExplore.ts           # Explore page data + filters
│   ├── useDeadlineReached.ts   # Registration deadline watcher
│   └── useConfetti.ts          # Success animation
│
├── lib/                        # Utilities and SDK wrappers
│   ├── sdk.ts                  # @bracketchain/sdk hook wrapper
│   ├── tournament.ts           # Tournament helpers
│   └── indexerToTournamentState.ts
│
├── constants/
│   ├── links.ts                # ROUTES, EXTERNAL_LINKS, SOLANA
│   └── tournament.ts           # FORMAT_INFO, PAYOUT_PRESETS, PROTOCOL_FEE
│
├── types/
│   └── tournament.ts           # All shared TypeScript types
│
├── tests/
│   └── tournament.test.ts
│
└── public/
```

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 10+ (`npm i -g pnpm@10` if missing)

### Installation

```bash
git clone https://github.com/bracketchain/bracketchain-frontend
cd bracketchain-frontend

# Install dependencies (matches CI — frozen lockfile)
make install

# or refresh the lockfile after editing package.json deps:
make install-update
```

### Environment Variables

```bash
make env   # copies .env.example → .env.local
```

Configure `.env.local`:

```env
# Solana RPC endpoint (required)
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Optional: Helius RPC for better performance
# NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Override the on-chain program ID. Falls back to the SDK 0.4.0 default
# (AuXJKpuZtkegs2ZSgopgckhN7Ev8bUz4zBc238LD2F1 on devnet) when unset.
# NEXT_PUBLIC_PROGRAM_ID=<program-pubkey>

# Indexer base URL. When unset, the app reads tournament state directly from
# RPC; with it set, list/detail pages prefer the indexer and fall back to
# chain reads if the indexer is stale or down.
# NEXT_PUBLIC_INDEXER_URL=https://indexer.example.com
```

### Development

```bash
make dev          # start dev server on :3000
make dev-turbo    # start with Turbopack (faster HMR)
```

### Build

```bash
make build        # production build
make preview      # build + start production server
```

## Available Commands

```bash
make help           # show all commands

make install        # install dependencies (pnpm install --frozen-lockfile)
make install-update # install + refresh pnpm-lock.yaml
make install-clean  # clean node_modules and reinstall

make dev            # development server
make dev-turbo      # development with Turbopack
make dev-https      # development with HTTPS (requires mkcert)
make build          # production build
make build-analyze  # build and open bundle analyzer
make start          # start production server (requires build first)
make preview        # build + start production server

make lint           # ESLint
make lint-fix       # ESLint with auto-fix
make type-check     # TypeScript check (no emit)
make check          # lint + type-check
make format         # Prettier (if installed)

make clean          # remove .next/ out/
make clean-modules  # remove node_modules
make clean-all      # remove everything including node_modules

make env            # create .env.local from .env.example
make ci             # full CI pipeline (install → lint → type-check → build)
make info           # show Node/npm/Next.js versions
```

## Architecture

### Data Flow

```
Write:  User → Web App → @bracketchain/sdk → wallet signs tx → Solana program
Read:   Web App → @bracketchain/sdk indexer client → PostgreSQL (when NEXT_PUBLIC_INDEXER_URL set)
                ↘ falls back to on-chain RPC reads when indexer is stale or unset
Live:   Tournament account WebSocket subscription via SDK `subscribe()`
        + 30s inactivity safety-net poll (Drift v2 pattern)
Sync:   Solana event → Helius webhook → Indexer → PostgreSQL
```

### SDK Integration

The frontend talks to the on-chain program through [`@bracketchain/sdk`](https://www.npmjs.com/package/@bracketchain/sdk) (currently `^0.4.0` — Kit + Codama edition). All writes are real Solana transactions signed by the connected wallet.

`lib/sdk.ts` bridges the wallet-adapter v1 surface to Kit: `useAnchorWallet()` (v1 `PublicKey` + `signAllTransactions(VersionedTransaction[])`) is wrapped into a Kit `TransactionPartialSigner` via `@solana/compat`'s `fromLegacyPublicKey` plus a `VersionedTransaction` round-trip for signing. RPC + RpcSubscriptions are derived from `NEXT_PUBLIC_RPC_URL` (HTTP) with the WS endpoint auto-flipped from `https://` → `wss://`.

It exposes three accessors:

- `useBracketChainClient()` — wallet-aware client used by all mutating flows (create / join / start / report / cancel). Returns `null` until a signer is connected.
- `useReadOnlySdkClient()` — signer-less client for query-only routes like `/t/[id]` viewers.
- `getIndexerClient()` — module-level singleton wrapping `BracketChainIndexerClient`; returns `null` when `NEXT_PUBLIC_INDEXER_URL` is unset so callers fall back to chain reads.

Mutating call-sites (real, not simulated):

| Call | File |
|---|---|
| `createTournament` | `features/tournament/create/CreateTournament.tsx` |
| `joinTournament`, `startTournament` | `features/tournament/view/TournamentSidebar.tsx` |
| `reportResult` (incl. final-match payout `remaining_accounts`) | `features/tournament/view/ReportResultModal.tsx` |
| `cancelTournament` (chunked refund + `remaining_accounts`) | `features/tournament/view/CancelModal.tsx` |

Errors are surfaced via typed SDK error classes (`BracketChainSDKError` + `mapError`) — see `describeError` in `CreateTournament.tsx` for the user-facing mapping (insufficient funds, registration closed, name taken, etc.).

### State Management

All async state uses the `useReducer` + discriminated union pattern to satisfy the `react-hooks/set-state-in-effect` ESLint rule:

```ts
type State =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error" };
```

Every data-fetching hook follows the same structure: `dispatch` is stable (unlike `setState`), cleanup via `active` flag prevents state updates after unmount, and retry is triggered via a second `useReducer` counter.

### Live Bracket Updates

`hooks/useTournamentView.ts` subscribes to the Tournament account through the SDK's `subscribe()` helper. Every account-change notification triggers a refetch, and a 30-second inactivity timer arms a safety-net poll so a silently-dropped WebSocket can't strand the UI on stale data.

### Wallet Integration

Wallet connection is handled globally via `Providers.tsx`, which wraps the app with `ConnectionProvider`, `WalletProvider`, and `WalletModalProvider` from `@solana/wallet-adapter-react`. `WalletProvider` is configured with `wallets={[]}` — connection works through Wallet Standard auto-discovery, so any WS-compliant wallet the user has installed (Phantom + Solflare on devnet today) appears in the modal without an explicit adapter import.

RPC endpoint is configured via `NEXT_PUBLIC_RPC_URL` — defaults to Solana devnet.

```ts
// Access wallet anywhere
const { publicKey, connected, signTransaction } = useWallet();
const { connection } = useConnection();
```

`lib/sdk.ts` consumes the same wallet via `useAnchorWallet()` and bridges it into a Kit `TransactionSigner` (see [SDK Integration](#sdk-integration)). Component code never needs to touch the bridge directly.

### Tournament Formats

| Format | Description | MVP status |
|---|---|---|
| `SE` | Single Elimination — one loss and you're out | ✅ Live |
| `DE` | Double Elimination — losers bracket second chance | 🚧 UI only; on-chain ix deferred to Phase 4 |
| `Swiss` | Swiss System — all play every round, matched by record | 🚧 UI only; on-chain ix deferred to Phase 4 |
| `RR` | Round Robin — everyone plays everyone | 🚧 UI only; on-chain ix deferred to Phase 3 |

The Create wizard currently rejects anything other than `SE` (see `ConfirmStep.tsx`). Render components for the other formats exist in `features/tournament/view/` for the eventual rollout.

### Protocol Fee

3.5% deducted from total prize pool at payout time. Shown as an estimate in the UI during tournament creation.

## Pages

| Route | Status | Description |
|---|---|---|
| `/` | ✅ Live | Landing — hero, stats, how it works, live tournaments |
| `/create` | ✅ Live | 3-step tournament creation wizard |
| `/t/[id]` | ✅ Live | Public bracket view, participants, escrow |
| `/dashboard` | ✅ Live | Organizer dashboard — manage tournaments, report results, analytics |
| `/explore` | ✅ Live | Tournament browser with filters |
| `/about` | 🚧 Placeholder | About page |

## Edge States

Every data-fetching component handles:

- **Loading** — skeleton loaders that match the shape of real content
- **Error** — "Unable to load" message + retry button
- **Empty** — contextual empty state with CTA
- **Not found** — 404 with link to `/explore` (tournament page only)

## Current Limitations

> MVP (devnet) is live. The frontend is wired to `@bracketchain/sdk` 0.4.0 (Kit + Codama) — every write is a real signed Solana transaction, every read comes from the indexer (when configured) with on-chain RPC fallback, and the tournament page subscribes to account changes over Kit `rpcSubscriptions.accountNotifications`.
>
> Remaining scope gaps, by area:

**Create wizard (MVP scope guards)**

- Only `SE` format reaches the on-chain `createTournament` call.
- Only `USDC` is accepted as the prize token.
- Custom payout splits (`PayoutPreset::Custom`) ship with the V1 program redeploy — UI exposes `WTA` / `Standard` / `Deep` only.

**Pending indexer endpoints**

- `DuplicateNameWarning` in `features/tournament/steps/` still uses a hardcoded list — the live `GET /tournaments/check-name` endpoint and the matching `useNameCheck` hook are tracked under Phase 0 § 3.3.

**Phase 1+ features (not yet started)**

- Steam OpenID linking + SAS attestation flow (V1.1).
- Player-reported / Oracle settlement modes, dispute window, claim panels — `ReportResultModal` currently implements the `OrganizerOnly` path only.
- BindFeedModal for Switchboard-backed match commitments.

**Phase 2+ features (not yet started)**

- Privy embedded-wallet / social-login flow.
- Web Push notification bus, service worker registration.
- Fiat on-ramp (MoonPay / Coinbase Pay).
- `/profile/[wallet]` route + cNFT badge surface.

**Placeholders**

- `/about` page is a placeholder.

See [`docs/plan_tasks/repo-frontend.md`](./docs/plan_tasks/repo-frontend.md) for the canonical phase plan and Stage-by-Stage checklist. The manual Phase 0 Stage 4 smoke test lives at [`docs/STAGE_4_SMOKE_TEST.md`](./docs/STAGE_4_SMOKE_TEST.md).

## Contributing

```bash
# Before committing
make check        # lint + type-check must pass

# Branch naming
feature/your-feature-name
fix/issue-description
```

## License

MIT