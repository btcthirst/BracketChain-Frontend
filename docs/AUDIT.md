# BracketChain Frontend Audit Report

**Date:** 2026-05-09  
**Branch:** `develop`  
**Auditor:** Claude Code  
**Scope:** Full frontend codebase review against PRD v2, Product Definition v2, and testing scenarios

---

## Executive Summary

The BracketChain frontend is a well-structured Next.js 16 (App Router) project targeting the Solana Hackathon MVP. The core user flows — Create Tournament, Join Tournament, Report Result, Cancel, and Explore — are implemented and functional. The UI quality is polished with consistent dark-theme design, proper loading/error/empty states, and real-time WebSocket subscriptions.

However, several **critical issues** exist that must be resolved before any production or hackathon demo deployment: hardcoded debug overrides left in production code, stub data served as real platform statistics, and incomplete/mismatched implementations between two parallel `ReportResultModal` components. Beyond that, there are significant accessibility gaps, devnet-only hardcoding that will break on mainnet, and a number of housekeeping issues.

The MVP scope is honestly represented in the UI (DE/Swiss/RR and Custom payout are visibly gated), and the on-chain plumbing (SDK integration, WebSocket live updates, indexer fallback, optimistic UI state) is implemented with notable care.

---

## 1. PRD Compliance — Features Implemented vs. Required

### MVP Scope (required by July 2026 Hackathon)

| Feature | Status | Notes |
|---|---|---|
| Single elimination bracket | Implemented | Full bracket visualization with match nodes |
| USDC escrow vault | Implemented | Entry fees + organizer deposit flow complete |
| Automatic payout on final match | Implemented | `reportResult` with `placements` arg triggers on-chain distribution |
| Cancellation refund | Implemented | `CancelModal` + `cancelTournament` SDK call |
| Create Tournament (3-step form) | Implemented | Details → Prize Pool → Confirm flow |
| Tournament View (/t/{id}) | Implemented | Header, bracket, sidebar, real-time updates |
| Organizer Dashboard | Implemented | Table view, manage sub-page, analytics |
| Tournament Discovery (/explore) | Implemented | Filters, pagination, tournament cards |
| Shareable tournament link | Implemented | Copy URL on ConfirmStep success screen |
| Wallet connect (Phantom/Backpack) | Implemented | Via wallet-adapter |
| Real-time bracket updates | Implemented | WebSocket subscription + 30s inactivity fallback |

### V1 Scope (correctly deferred)

| Feature | Status | Notes |
|---|---|---|
| Double Elimination | Deferred | Visible but disabled in form; documented as V1 |
| Swiss / Round-Robin formats | Deferred | Same as above |
| Player-reported results with disputes | Not started | No UI, no contract support in MVP |
| Player Profile page (/player/{wallet}) | Missing | PRD mandates this for V1; no route exists |
| Social login (Privy/Dynamic) | Not started | Expected V1 |
| CSV export from dashboard | Missing | PRD US-O03 specifies this for dashboard history |
| Multi-token support (SOL/custom SPL) | Correctly deferred | UI gates with `available: false` |

### Partially Implemented

| Feature | Notes |
|---|---|
| Stats Bar (landing page) | Hardcoded stub data — see Critical Issues |
| Tournament Discovery filters | Server-side filtering disabled (commented out); all filtering is client-side on a 100-row fetch |
| Duplicate name check | Hardcoded list of 4 known names; real API endpoint not yet wired |
| Start time field | PRD calls it "Start Date & Time" but the form uses "Registration Closes" — semantically different |

---

## 2. Critical Issues (Blockers)

### C1 — Hardcoded Debug Override in Production Code

**File:** `hooks/useTournamentView.ts`, line 181

```ts
if (address === "DRVqTngSGUsrmZQZvbw1xQ2fkxcx2hEq9uXt7pvu4yHg" && status === "registration") {
    maxParticipants = 2;
}
```

A specific Solana PDA address is hardcoded to override `maxParticipants` to `2` during testing. This ships to production and will silently misrepresent a specific live tournament to all users. Remove before any demo or deployment.

---

### C2 — Landing Page Stats Are Fake / Stub Data

**File:** `hooks/useStats.ts`, lines 32–44

```ts
// TODO: replace with real endpoint — GET /api/stats
async function fetchStats(): Promise<StatsData> {
    await new Promise(r => setTimeout(r, 1200));
    if (Math.random() < 0.1) throw new Error("API unavailable");
    return {
        tournamentsCreated: 1247,
        totalPrizeVolume: 892500,
        gamesIntegrated: 12,
        avgPayoutSeconds: 8,
    };
}
```

The stats bar on the landing page shows fabricated numbers (1,247 tournaments, $892,500 prize volume, 12 integrations). This is deceptive to investors, partners, and hackathon judges. The `Math.random() < 0.1` simulated failure also makes the landing page randomly show error state for 10% of visitors.

**Action required:** Wire to a real `/api/stats` endpoint or hide the section until real data exists.

---

### C3 — Two Incompatible `ReportResultModal` Components

There are two separate, functionally different implementations of the Report Result modal:

- `features/tournament/view/ReportResultModal.tsx` — used by `TournamentPage` (public tournament view). Contains full placement logic for Standard/Deep payout presets, confirmation-race detection (`didActionSettle`), 3rd place picker, quarterfinal loser derivation.
- `features/dashboard/ReportResultModal.tsx` — used by `ManageView` in the dashboard. Simpler placement logic: derives placements by participant's deepest round, does NOT handle the confirmation-race case, does NOT have the 3rd place UI for Standard preset.

The two modals can produce different `placements` arrays for the same tournament. For Standard preset (60/25/15), the dashboard version auto-derives 3rd place by deepest round without asking, while the tournament-view version requires the organizer to explicitly select. For Deep preset, the dashboard version includes ALL non-finalist participants sorted by depth, which may exceed the contract's expected 7-placement array.

**Action required:** Consolidate into a single `ReportResultModal` or explicitly document which one is authoritative and why both exist.

---

### C4 — Explorer Links Double-Append `?cluster=devnet`

**File:** `features/tournament/view/TournamentPage.tsx`, lines 117–128

The `CancelledBanner` component constructs explorer URLs as:
```ts
`${SOLANA.explorerTx(tx)}?cluster=devnet`
```
But `SOLANA.explorerTx` from `constants/links.ts` already appends `?cluster=devnet`:
```ts
explorerTx: (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`
```

This produces malformed URLs: `https://explorer.solana.com/tx/{sig}?cluster=devnet?cluster=devnet`, breaking the Solana Explorer links in the cancellation banner.

---

### C5 — Indexer Filter Parameters Permanently Commented Out

**File:** `lib/indexer.ts`, lines 67–75

```ts
// if (opts.name) params.set("name", opts.name);
// These parameters are currently not supported by the production indexer
// and cause a 400 Bad Request if provided.
// if (opts.format) params.set("format", opts.format);
// if (opts.game) params.set("game", opts.game);
// ...
```

`name`, `format`, `game`, `minPrize`, `maxPrize`, and `freeOnly` filters are never sent to the indexer. The `useExplore` hook fetches up to 100 items (hardcoded) and filters client-side. This means:
- Pagination is fake: the "Load More" button pages through an already-fetched 100-item array, not real server pages.
- Large deployments (>100 tournaments) will silently truncate results.
- Search by name is purely client-side on a 100-row sample.

**Action required:** Track this as a known limitation, raise the limit, or implement real server-side filtering once the indexer supports it.

---

## 3. Warnings (Non-Critical But Worth Fixing)

### W1 — `console.log(err)` Left in `CreateTournament.tsx`

**File:** `features/tournament/create/CreateTournament.tsx`, line 151

Raw error objects are logged to the browser console. In production this can expose internal SDK structures or RPC error details to users inspecting devtools. Replace with `console.error` at minimum; consider removing entirely.

---

### W2 — Hardcoded Devnet Cluster in `constants/links.ts`

**File:** `constants/links.ts`, lines 29–31

All Solana Explorer links point to `?cluster=devnet`. When the project moves to mainnet, every transaction link shown in the UI (payout transactions, refund transactions, match results) will point to the wrong cluster. This should be driven by `NEXT_PUBLIC_SOLANA_CLUSTER` env var.

---

### W3 — `useStats` Random 10% Failure Rate

**File:** `hooks/useStats.ts`, line 37

The simulated 10% API failure will randomly show an error state on the landing page for real visitors. This is a demo artifact that must not go to production.

---

### W4 — `DuplicateNameWarning` Uses a Static Hardcoded List

**File:** `features/tournament/steps/DuplicateNameWarning.tsx`, lines 32–39

The check against duplicate names queries a hardcoded list of 4 strings and simulates a 400ms network delay. It will never catch actual duplicate names and silently passes all real tournament names as "available." The `TODO` comment acknowledges this but it's easy to overlook. A misleading UI check is worse than no check.

---

### W5 — `useDashboard` Makes N+1 On-Chain RPC Calls

**File:** `hooks/useDashboard.ts`, lines 106–123

After fetching the indexer list, the dashboard fires individual `getTournament(client, pda)` calls for every tournament (up to 100) in a `Promise.all`. At scale this generates significant RPC traffic. The indexer should be the source of truth for status; the on-chain enrichment should be limited to tournaments whose indexer status is known stale or uncertain.

Same pattern exists in `hooks/useExplore.ts` (lines 140–162) and `hooks/useTournaments.ts` (lines 66–84).

---

### W6 — `scratch/inspect_tournament.ts` Committed to Repository

**File:** `scratch/inspect_tournament.ts`

A developer script with hardcoded devnet RPC URL and `console.log` calls is committed to the repository root. It has no effect on the build but adds noise and should be moved to `.gitignore` or deleted.

---

### W7 — Participant Count Derivation Is Error-Prone

**File:** `lib/tournament.ts`, lines 53–55; `hooks/useTournamentView.ts`, lines 196–197

Participant count for non-completed tournaments is derived arithmetically:
```ts
const participants = entryFeeMicro > 0n && t.grossPool != null
    ? Math.max(0, Number((BigInt(t.grossPool) - organizerDepositMicro) / entryFeeMicro))
    : 0;
```

This produces `0` for any free-entry tournament (entryFee = 0) at the list/card level. Free tournaments will always show "0 participants" on explore cards even when they have registered players, because there's no entry fee to divide by. The real count is only available after an on-chain enrichment call.

---

### W8 — `useWalletBalance` Uses Devnet USDC Mint Hardcoded

**File:** `hooks/useWalletBalance.ts`, line 8

```ts
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
```

The devnet USDC mint is hardcoded. On mainnet, USDC is `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`. This will show `0 USDC` balance for all mainnet users, breaking the balance warning and insufficient-balance gating.

---

### W9 — Mobile Responsiveness Gap in Tournament View

**File:** `features/tournament/view/TournamentPage.tsx`, line 172

```tsx
<div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }}
     className="lg:grid-cols-[1fr_320px] grid-cols-1">
```

The `gridTemplateColumns` inline style overrides the Tailwind responsive class. On mobile, the grid always renders as two columns (bracket + sidebar side by side), ignoring the `grid-cols-1` Tailwind class. Inline `style` takes precedence over Tailwind utilities. The `lg:` responsive breakpoint is effectively a no-op.

---

### W10 — Missing Keyboard Escape Handler on Modals

All three modals (`ReportResultModal` in both locations, `CancelModal`, `MatchModal` in `BracketView`) lack `onKeyDown` handlers to close on `Escape`. Users expect modals to close with Escape; without it, keyboard-only users have no way to dismiss.

---

### W11 — `TournamentPage` IIFE Pattern Is Hard to Read

**File:** `features/tournament/view/TournamentPage.tsx`, lines 159–211

The success render branch uses an immediately-invoked function expression `(() => { ... })()` inline in JSX. This is an unusual pattern that harms readability. Extract the success content into a named component (e.g., `TournamentContent`).

---

### W12 — `DashboardContent` Calls `useDashboard` Twice

**File:** `features/dashboard/DashboardPage.tsx`, lines 152–155

```ts
const { state, refresh } = useDashboard(filter);
const { state: allState } = useDashboard("all");
```

`DashboardContent` mounts two independent `useDashboard` hooks — one for the current filter tab and one always fetching "all" for analytics. This doubles the indexer requests and the N+1 on-chain enrichment calls. The "all" fetch also ignores `refresh` entirely, so analytics won't update after manual refresh.

---

### W13 — `ManageView` Does Not Respect `bracketReady`

**File:** `features/dashboard/ManageView.tsx`, lines 146–210

Unlike `TournamentPage.tsx` which gates "Report Result" on `t.bracketReady`, the dashboard's `ManageView` shows all `in_progress` matches for reporting without checking `bracketReady`. An organizer could attempt to report results while bracket initialization is still in progress, which will fail on-chain.

---

## 4. Best Practice Violations

### BP1 — Mixed Animation Libraries

The project imports animations from both `motion/react` (via `MotionDiv` wrapper) and `framer-motion` directly:

- `components/ui/motion-wraper.tsx`: `import { motion } from "motion/react"`
- `features/explore/components/TournamentCard.tsx`: `import { motion } from "framer-motion"`

Both packages are installed (`node_modules` contains `framer-motion`, `motion`, `motion-dom`, `motion-utils`). `motion/react` is the new package name for Framer Motion v11+; `framer-motion` is the legacy name. Both are likely resolving to the same underlying library, but this inconsistency wastes bundle space if they resolve to different versions, and creates confusion about which import to use. Standardize on `motion/react`.

---

### BP2 — Heavy Unused Dependencies in `package.json`

The following packages appear in `package.json` but have no `import` found in the codebase:

- `react-router` (7.13.0) — not used; the app uses Next.js App Router
- `react-slick` (0.31.0) — no import found
- `react-dnd` + `react-dnd-html5-backend` — no import found
- `react-responsive-masonry` — no import found
- `@mui/material` + `@emotion/react` + `@emotion/styled` — only `@mui/icons-material` (GitHubIcon in Footer) and `@mui/material-nextjs` are used; the full MUI theme is loaded for a single icon

These add significant bundle weight. Consider replacing the single MUI icon with an inline SVG or Lucide icon.

---

### BP3 — Inline `style` Pervasive Throughout Codebase

The codebase uses inline `style` objects extensively in all feature components (`TournamentSidebar.tsx`, `BracketView.tsx`, `TournamentPage.tsx`, `ReportResultModal.tsx`, etc.) rather than Tailwind classes or CSS modules. This:

- Creates new object references on every render, causing unnecessary re-renders for memoized child components
- Makes style sharing and theming harder (CSS variables defined in `globals.css` are unused in most components)
- Prevents responsive utilities from working (see W9)

The `globals.css` file defines a full design token system (`--accent`, `--text`, `--bg`, etc.) that is not used in the components; instead, hex values are hardcoded inline everywhere.

---

### BP4 — `as never` Casts Are Widespread

`getEnumKind(x as never)` appears in at least 6 files (`useTournamentView.ts`, `useDashboard.ts`, `useTournaments.ts`, `useExplore.ts`, `lib/sdk.ts`, `features/tournament/view/ReportResultModal.tsx`). The `as never` cast is used to suppress TypeScript's type checker when calling the SDK's `getEnumKind` function. This suppresses legitimate type errors. The underlying SDK type for Anchor enums should be typed properly, or the cast should at minimum be `as unknown as ExpectedType`.

---

### BP5 — No Input Sanitization for Tournament Name in Create Flow

**File:** `features/tournament/steps/ValidateState.ts`

Validation checks length (≤32 chars) and non-empty, but does not sanitize for:
- Leading/trailing spaces beyond `.trim()` — currently only trimmed at submission, not during validation preview
- Characters that could cause display issues (e.g., null bytes, right-to-left overrides)

The PRD (Section 7, Security Requirements) explicitly requires "Input sanitization." The on-chain program enforces its own rules, but the frontend should sanitize before submission.

---

### BP6 — `TxState` Does Not Use `pending` State

**File:** `features/tournament/create/CreateTournament.tsx`, line 165

```ts
const isProcessing = txState === "signing" || txState === "pending";
```

`txState` transitions from `"signing"` directly to `"success"` or `"error"` — `"pending"` is never set in `handleConfirm`. The UI copy for `pending` state ("Creating tournament on Solana…") is dead code. Either implement the pending state properly (set it after the wallet popup approves but before on-chain confirmation) or remove the state.

---

### BP7 — No `React.memo` or `useCallback` on Bracket Render Components

**File:** `features/tournament/view/BracketView.tsx`

`MatchNode` and `PlayerSlot` are recreated on every parent render. For a 128-participant bracket (127 matches), this is 127 × 2 player slot components + 127 match nodes per render cycle. Given that `BracketView` re-renders on every WebSocket tick (every result report), wrapping `MatchNode` in `React.memo` and stabilizing callbacks with `useCallback` would significantly reduce render work.

---

### BP8 — Explorer Links Hardcode Devnet Cluster

Covered in W2, but also a best-practice violation: cluster should be derived from environment configuration, not hardcoded in `constants/links.ts`.

---

### BP9 — No Error Boundary Around Tournament Content

There is no `ErrorBoundary` component wrapping the tournament view, bracket, or modals. If the SDK's `getEnumKind` call throws on malformed on-chain data (which the defensive clamping in `buildView` tries to prevent), the entire page crashes to a blank screen. An `ErrorBoundary` with a graceful fallback would contain the blast radius.

---

### BP10 — `vercel.json` Not Reviewed for Headers/CSP

The PRD (Section 7) requires CSP/CORS headers. No `vercel.json` security header configuration was found during the audit. At minimum, `X-Frame-Options`, `X-Content-Type-Options`, and a `Content-Security-Policy` should be set.
<br>
**File:** `vercel.json` — confirm it contains security headers before production deployment.

---

## 5. Positive Notes

### What Is Done Well

**Real-time architecture is solid.** The `useTournamentView` hook implements WebSocket subscription with an inactivity safety net (30s fallback to RPC), abort controller cleanup, and optimistic local state — all following production Solana client patterns.

**Error state coverage is thorough.** Every major data-fetching component (`ExplorePage`, `DashboardPage`, `TournamentPage`, `ManageView`) has distinct loading, error, empty, and not-found states with retry actions. This matches the PRD's documented error flows closely.

**Confirmation-race handling in `ReportResultModal`.** The `didActionSettle` function in `features/tournament/view/ReportResultModal.tsx` re-reads on-chain state after an Anchor RPC timeout to determine whether the transaction actually landed. This prevents false-negative error toasts for successful transactions — a subtle but important UX improvement.

**Defensive on-chain data clamping.** `buildView` in `useTournamentView.ts` clamps `maxParticipants` to `[2, 128]` before using it, treating on-chain account data as untrusted. This is the correct security posture for reading arbitrary PDAs.

**Bracket-init progress surfaced to organizer.** The `bracketReady` / `matchesInitialized` / `totalMatches` mechanism exposes the multi-chunk bracket initialization progress to the organizer with a progress bar and a "Continue Bracket Init" button. This handles a real edge case (the organizer closing the browser mid-initialization) cleanly.

**PRD scope gating is honest.** Non-MVP features (Double Elimination, Swiss, Round-Robin, Custom payout, SOL/custom SPL) are all visible in the UI but explicitly disabled with `available: false` and version labels (V1/V2). This communicates the roadmap without hiding incomplete functionality.

**Type safety for tournament states.** `TournamentView`, `Match`, `Player`, `PayoutDistribution` types in `types/tournament.ts` provide good compile-time safety for the UI layer. The `TxState` union type for the create flow is a clean pattern.

**`useWalletBalance` refresh after join.** After a successful `joinTournament`, `refreshBalance()` is called immediately so the sidebar USDC display reflects the spend without waiting for a page reload or the next WebSocket tick.

**Optimistic joined state.** `setOptimisticJoined(true)` in `TournamentSidebar.tsx` prevents double-join attempts during indexer lag, as required by EDGE_CASES_TEST.md §3.1.

**AbortController usage.** Every `useEffect` that initiates a network fetch creates an `AbortController` and calls `ac.abort()` on cleanup. This prevents state updates on unmounted components and avoids stale data from in-flight requests.

---

## 6. Summary Table

| Category | Count | Severity |
|---|---|---|
| Critical (blocker) | 5 | Must fix before demo/deployment |
| Warning | 13 | Should fix before V1 |
| Best practice violation | 10 | Address in ongoing development |
| Positive items noted | 10 | — |

---

## 7. Recommended Fix Priority

1. **C1** — Remove hardcoded PDA debug override (`useTournamentView.ts:181`)
2. **C2** — Replace stub stats with real data or hide the stats bar
3. **C4** — Fix double `?cluster=devnet` in `TournamentPage.tsx` cancelled banner      +Fixed
4. **C3** — Audit and consolidate the two `ReportResultModal` implementations          +Fixed
5. **C5** — Document the 100-row indexer limit; add an env-driven override
6. **W2 + W8** — Make cluster and USDC mint address env-var driven
7. **W9** — Fix inline `gridTemplateColumns` overriding Tailwind responsive classes in `TournamentPage`
8. **W10** — Add Escape key handler to all modals
9. **W13** — Gate report buttons in `ManageView` on `bracketReady`
10. **BP2** — Audit and remove unused npm packages

---

*Report generated from static code analysis and cross-reference against BracketChain_PRD_v2.docx, BracketChain_Product_Definition_v2.docx, and all five testing scenario documents in `docs/testing_scenario/`.*

