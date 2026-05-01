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
| UI Components | shadcn/ui + Radix UI |
| Animations | Motion (Framer Motion) |
| Blockchain | Solana — `@solana/wallet-adapter` |
| Wallet UI | Phantom / Backpack / Solflare |
| Package Manager | npm |
| Deployment | Vercel |

## Project Structure

```
bracketchain-frontend/
├── app/                        # Next.js App Router
│   ├── create/                 # /create — tournament creation wizard
│   ├── t/[id]/                 # /t/:id — public tournament view
│   ├── explore/                # /explore — placeholder
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
├── features/tournament/        # Tournament feature module
│   ├── create/
│   │   └── CreateTournament.tsx  # 3-step creation wizard
│   ├── view/
│   │   ├── TournamentPage.tsx    # /t/[id] page shell
│   │   ├── TournamentHeader.tsx  # Name, badges, info strip, share
│   │   ├── BracketView.tsx       # Bracket tree + match modal
│   │   └── TournamentSidebar.tsx # Participants, escrow, actions
│   └── steps/                    # Create wizard steps
│       ├── DetailsStep.tsx
│       ├── PrizeStep.tsx
│       ├── ConfirmStep.tsx
│       ├── Stepper.tsx
│       ├── FieldGroup.tsx
│       ├── BalanceWarning.tsx
│       ├── DuplicateNameWarning.tsx
│       └── ValidateState.ts
│
├── hooks/                      # Custom React hooks
│   ├── useWalletBalance.ts     # SOL + USDC balance fetcher
│   ├── useStats.ts             # Landing page stats
│   ├── useTournaments.ts       # Live tournaments list
│   ├── useTournamentView.ts    # Single tournament detail
│   └── useConfetti.ts          # Success animation
│
├── constants/
│   ├── links.ts                # ROUTES, EXTERNAL_LINKS, SOLANA
│   └── tournament.ts           # FORMAT_INFO, PAYOUT_PRESETS, PROTOCOL_FEE
│
├── types/
│   └── tournament.ts           # All shared TypeScript types
│
└── public/
```

## Getting Started

### Prerequisites

- Node.js 24+
- npm 10+

### Installation

```bash
git clone https://github.com/bracketchain/bracketchain-frontend
cd bracketchain-frontend

# Install dependencies
make install

# or if you hit peer dependency conflicts:
make install-fix
```

### Environment Variables

```bash
make env   # copies .env.example → .env.local
```

Configure `.env.local`:

```env
# Solana RPC endpoint
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Optional: Helius RPC for better performance
# NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
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
make help         # show all commands

make install      # install dependencies (npm ci)
make install-fix  # install with --legacy-peer-deps

make dev          # development server
make dev-turbo    # development with Turbopack
make build        # production build
make preview      # build + serve

make lint         # ESLint
make type-check   # TypeScript check (no emit)
make check        # lint + type-check

make clean        # remove .next/ out/
make clean-all    # remove everything including node_modules

make env          # create .env.local from .env.example
make ci           # full CI pipeline
make info         # show Node/npm/Next.js versions
```

## Architecture

### Data Flow

```
Write:  User → Web App → Wallet signs tx → Solana program → on-chain state
Read:   Web App → API → PostgreSQL (indexed)
                      ↘ fallback to RPC if stale (>30s)
Sync:   Solana event → Helius webhook → Indexer → PostgreSQL
```

### State Management

All async state uses the `useReducer` + discriminated union pattern to satisfy `react-hooks/set-state-in-effect` ESLint rule:

```ts
type State =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error" };
```

Every data-fetching hook follows the same structure: `dispatch` is stable (unlike `setState`), cleanup via `active` flag prevents state updates after unmount, and retry is triggered via a second `useReducer` counter.

### Wallet Integration

Wallet connection is handled globally via `Providers.tsx` which wraps the app with `ConnectionProvider`, `WalletProvider`, and `WalletModalProvider` from `@solana/wallet-adapter-react`.

RPC endpoint is configured via `NEXT_PUBLIC_RPC_URL` — defaults to Solana devnet.

```ts
// Access wallet anywhere
const { publicKey, connected, signTransaction } = useWallet();
const { connection } = useConnection();
```

### Tournament Formats

| Format | Description |
|---|---|
| `SE` | Single Elimination — one loss and you're out |
| `DE` | Double Elimination — losers bracket second chance |
| `Swiss` | Swiss System — all play every round, matched by record |
| `RR` | Round Robin — everyone plays everyone |

### Protocol Fee

3.5% deducted from total prize pool at payout time. Shown as an estimate in the UI during tournament creation.

## Pages

| Route | Status | Description |
|---|---|---|
| `/` | ✅ Live | Landing — hero, stats, how it works, live tournaments |
| `/create` | ✅ Live | 3-step tournament creation wizard |
| `/t/[id]` | ✅ Live | Public bracket view, participants, escrow |
| `/explore` | 🚧 Placeholder | Tournament browser |
| `/about` | 🚧 Placeholder | About page |

## Edge States

Every data-fetching component handles:

- **Loading** — skeleton loaders that match the shape of real content
- **Error** — "Unable to load" message + retry button
- **Empty** — contextual empty state with CTA
- **Not found** — 404 with link to `/explore` (tournament page only)

## Current Limitations (MVP v0)

> This is a frontend prototype. The following are not yet implemented:

- Real Solana transactions — all blockchain interactions are simulated with `setTimeout`
- API layer — all data is mock/hardcoded
- WebSocket subscriptions — no real-time bracket updates
- Result reporting — organizer "Report Result" button is UI-only
- `/explore` and `/about` pages are placeholders

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