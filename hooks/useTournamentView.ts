"use client";

import { useEffect, useReducer, useCallback } from "react";
import { address, type Address } from "@solana/kit";
import {
    getTournamentState,
    IndexerMatch,
    IndexerParticipant,
    IndexerPayout,
    IndexerTournament,
    MatchStatus,
    PayoutPreset,
    subscribe,
    TournamentStatus,
    type BracketChainClient,
    type MatchNode,
    type MatchNodeWithAddress,
    type ParticipantWithAddress,
    type Tournament,
    type TournamentState,
} from "@bracketchain/sdk";

import { useReadOnlySdkClient, getIndexerClient } from "@/lib/sdk";
import { indexerToTournamentState } from "@/lib/indexerToTournamentState";
import type {
    Match,
    Player,
    PayoutDistribution,
    TournamentStatus as UITournamentStatus,
    TournamentView,
} from "@/types/tournament";

// ── Constants ─────────────────────────────────────────────────────────────────

const USDC_DECIMALS = 1_000_000;
const MAX_PARTICIPANTS = 128;
const MIN_PARTICIPANTS = 2;
const DEFAULT_ADDRESS = address("11111111111111111111111111111111");

// PayoutPreset numeric variant → preset key. Mirrors PayoutPreset on-chain.
const PAYOUT_PRESETS = {
    winnerTakesAll: [{ place: 1, label: "1st", pct: 100 }],
    standard: [
        { place: 1, label: "1st", pct: 60 },
        { place: 2, label: "2nd", pct: 25 },
        { place: 3, label: "3rd", pct: 15 },
    ],
    deep: [
        { place: 1, label: "1st", pct: 40 },
        { place: 2, label: "2nd", pct: 25 },
        { place: 3, label: "3rd", pct: 15 },
        { place: 4, label: "4th", pct: 10 },
        { place: 5, label: "5th", pct: 5 },
        { place: 6, label: "6th", pct: 3 },
        { place: 7, label: "7th", pct: 2 },
    ],
} as const;

const STATUS_MAP: Record<TournamentStatus, UITournamentStatus> = {
    [TournamentStatus.Registration]: "registration",
    [TournamentStatus.PendingBracketInit]: "in_progress",
    [TournamentStatus.Active]: "in_progress",
    [TournamentStatus.Completed]: "completed",
    [TournamentStatus.Cancelled]: "cancelled",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(addr: string): string {
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function isValidAddress(s: string): boolean {
    try {
        address(s);
        return true;
    } catch {
        return false;
    }
}

function isDefaultAddress(addr: Address): boolean {
    return addr === DEFAULT_ADDRESS;
}

function makePlayer(addr: string, organizerAddress: string): Player {
    return {
        address: addr,
        display: truncate(addr),
        isOrganizer: addr === organizerAddress,
    };
}

function findPlayerByAddress(
    addr: Address,
    _participants: ParticipantWithAddress[],
    organizerAddress: string,
): Player | null {
    // Why: the Match PDA is the source of truth for who played in this slot —
    // start_tournament writes both pubkeys at bracket-init time. Cross-checking
    // against the participants list was defensive code that broke completed
    // tournaments: after claim_prize closes Participant PDAs, the list is
    // empty even though the Match still has valid playerA/playerB pubkeys.
    if (isDefaultAddress(addr)) return null;
    return makePlayer(addr.toString(), organizerAddress);
}

function presetKey(preset: PayoutPreset): keyof typeof PAYOUT_PRESETS {
    switch (preset) {
        case PayoutPreset.WinnerTakesAll: return "winnerTakesAll";
        case PayoutPreset.Standard: return "standard";
        case PayoutPreset.Deep: return "deep";
        default: return "winnerTakesAll";
    }
}

function matchUiStatus(status: MatchStatus): Match["status"] {
    switch (status) {
        case MatchStatus.Pending: return "pending";
        case MatchStatus.Active: return "in_progress";
        case MatchStatus.Completed: return "completed";
        default: return "pending";
    }
}

function buildMatch(
    node: MatchNode,
    participants: ParticipantWithAddress[],
    organizerAddress: string,
    index: number,
): Match {
    return {
        id: `r${node.round}-m${node.matchIndex}-${index}`,
        round: node.round + 1, // on-chain rounds are 0-indexed; UI is 1-indexed
        position: node.matchIndex,
        playerA: findPlayerByAddress(node.playerA, participants, organizerAddress),
        playerB: findPlayerByAddress(node.playerB, participants, organizerAddress),
        winner: findPlayerByAddress(node.winner, participants, organizerAddress),
        status: matchUiStatus(node.status),
        // Scores + match-tx signature are not tracked on-chain in MVP.
        // Bracket UI conditionally renders this block — null is safe.
        result: null,
    };
}

function buildPayouts(
    preset: keyof typeof PAYOUT_PRESETS,
    grossPoolUsdc: number,
    feeBps: number,
    indexerRows: IndexerPayout[],
    participants: ParticipantWithAddress[],
    organizerAddress: string,
): PayoutDistribution[] {
    const netPoolUsdc = grossPoolUsdc * (1 - feeBps / 10_000);
    const entries = PAYOUT_PRESETS[preset];

    return entries.map((e) => {
        const indexed = indexerRows.find(
            (r) => r.kind === "Prize" && r.placement === e.place,
        );
        const amountFromIndexer = indexed
            ? Number(BigInt(indexed.amount)) / USDC_DECIMALS
            : null;

        const recipientAddress = indexed?.recipient ?? null;
        const recipient =
            recipientAddress && participants.some((p) => p.account.wallet.toString() === recipientAddress)
                ? makePlayer(recipientAddress, organizerAddress)
                : recipientAddress
                    ? makePlayer(recipientAddress, organizerAddress)
                    : null;

        return {
            place: e.place,
            label: e.label,
            pct: e.pct,
            amount: amountFromIndexer ?? (netPoolUsdc * e.pct) / 100,
            recipient,
            txSignature: indexed?.txSignature ?? null,
        };
    });
}

function buildView(
    state: TournamentState,
    payouts: IndexerPayout[],
    feeBps: number,
): TournamentView {
    const t = state.tournament as Tournament;
    const organizerAddress = t.organizer.toString();
    const stateAddress = state.address.toString();

    // Defensive: clamp on-chain values into known-safe ranges before using them.
    // Treat on-chain data as untrusted (account could be malformed in adversarial setups).
    let maxParticipants = Math.max(
        MIN_PARTICIPANTS,
        Math.min(MAX_PARTICIPANTS, Number(t.maxParticipants) || MIN_PARTICIPANTS),
    );

    const status: UITournamentStatus = STATUS_MAP[t.status] ?? "registration";

    // DEBUG OVERRIDE: Shorten specific tournament for testing (only during registration)
    if (stateAddress === "DRVqTngSGUsrmZQZvbw1xQ2fkxcx2hEq9uXt7pvu4yHg" && status === "registration") {
        maxParticipants = 2;
    }
    const presetKind = presetKey(t.payoutPreset);

    const entryFeeUsdc = Number(t.entryFee) / USDC_DECIMALS;
    const participantCount = state.participants.length;
    // Variant B (plan 2026-05-03 decision): organizer_deposit goes INTO the
    // prize pool and is distributed via the preset on completion. It's only
    // refunded on cancel, so subtract it back out once the cancel handler has
    // marked it refunded.
    const depositRefunded = status === "cancelled" && Boolean(t.organizerDepositRefunded);
    const organizerDepositUsdc = depositRefunded
        ? 0
        : Number(t.organizerDeposit) / USDC_DECIMALS;
    const grossPoolUsdc = entryFeeUsdc * participantCount + organizerDepositUsdc;

    const players: Player[] = state.participants.map((p) =>
        makePlayer(p.account.wallet.toString(), organizerAddress),
    );

    const matches: Match[] = state.bracket.map((b: MatchNodeWithAddress, i) =>
        buildMatch(b.account, state.participants, organizerAddress, i),
    );

    const refundTxSignatures = payouts
        .filter((p) => p.kind === "Refund")
        .map((p) => p.txSignature)
        .filter((sig): sig is string => sig !== null);

    // Bracket-init progress. On-chain `matches_initialized` ramps up across
    // start_tournament chunks; report_result requires status === Active, which
    // only fires once the last chunk lands. Surface explicitly so UI can gate
    // the report flow even though the status pill says "in_progress" already.
    const matchesInitialized = Number(t.matchesInitialized) || 0;
    const totalMatches = Number(t.totalMatches) || 0;
    const bracketReady =
        t.status === TournamentStatus.Active ||
        t.status === TournamentStatus.Completed ||
        (totalMatches > 0 && matchesInitialized >= totalMatches);

    return {
        id: stateAddress,
        name: t.name,
        // No on-chain `game` field in MVP — all tournaments labelled generically.
        game: "On-chain",
        // Single-elim only (MVP).
        format: "SE",
        status,
        prizePool: grossPoolUsdc,
        token: "USDC",
        entryFee: entryFeeUsdc,
        maxParticipants,
        participants: players,
        matches,
        payouts: buildPayouts(
            presetKind,
            grossPoolUsdc,
            feeBps,
            payouts,
            state.participants,
            organizerAddress,
        ),
        organizer: makePlayer(organizerAddress, organizerAddress),
        startTime: new Date(Number(t.createdAt) * 1000).toISOString(),
        registrationDeadline: new Date(Number(t.registrationDeadline) * 1000).toISOString(),
        cancelledTxSignature: null, // Lean indexer doesn't track cancel tx — V1.
        refundTxSignatures,
        matchesInitialized,
        totalMatches,
        bracketReady,
    };
}

// ── State machine ─────────────────────────────────────────────────────────────

type State =
    | { status: "loading" }
    | { status: "success"; data: TournamentView }
    | { status: "not_found" }
    | { status: "error" };

type Action =
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; data: TournamentView }
    | { type: "FETCH_NOT_FOUND" }
    | { type: "FETCH_ERROR" };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "FETCH_START":
            // Stale-while-revalidate: on refresh (state already success), keep
            // showing the previous data while the new fetch runs in the
            // background. Only the initial load — or recovery from
            // not_found/error — shows the loading skeleton. Without this,
            // every refresh unmounts TournamentSidebar and resets its local
            // state (optimisticJoined), causing the post-Join UI to revert
            // to the Join button until the indexer catches up.
            return state.status === "success" ? state : { status: "loading" };
        case "FETCH_SUCCESS": return { status: "success", data: action.data };
        case "FETCH_NOT_FOUND": return { status: "not_found" };
        case "FETCH_ERROR": return { status: "error" };
        default: return { status: "loading" };
    }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const PROTOCOL_FEE_BPS = 350; // 3.5% — matches on-chain ProtocolConfig default.

// Phase 5.3: indexer SWR knobs.
//
//   INDEXER_TIMEOUT_MS — abort indexer fetches after this long and try chain.
//     3 s matches the Phase 5 acceptance gate ("indexer down → app continues").
//
//   STALE_SLOT_THRESHOLD — when the indexer's chainSlotAtWrite is older than
//     this many slots vs the current cluster slot, treat indexer data as
//     stale and prioritise chain reads. Solana mainnet/devnet ≈ 400 ms/slot,
//     so 150 slots ≈ 60 s — matches spec §6.3 "stale > 30 s" intent in slot
//     domain (slot is more accurate than wall-clock).
const INDEXER_TIMEOUT_MS = 3_000;
const STALE_SLOT_THRESHOLD = 150;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
        promise.then(
            (v) => {
                clearTimeout(t);
                resolve(v);
            },
            (e) => {
                clearTimeout(t);
                reject(e);
            },
        );
    });
}

interface IndexerBundle {
    tournament: IndexerTournament;
    participants: IndexerParticipant[];
    matches: IndexerMatch[];
    payouts: IndexerPayout[];
    chainSlotAtWrite: bigint;
}

/**
 * Fetch all indexer slices in parallel + the cluster's current slot.
 * Returns null on any indexer failure (treated as "indexer down" — caller
 * falls back to chain). Per-call abort via shared AbortSignal.
 */
async function loadFromIndexer(
    client: BracketChainClient,
    pda: Address,
    signal: AbortSignal,
): Promise<{ bundle: IndexerBundle; currentSlot: number } | null> {
    const indexer = getIndexerClient();
    if (!indexer) return null;  // INDEXER_URL not configured

    const addrStr = pda.toString();

    try {
        const [tournament, participants, matches, payouts, slotResp] = await Promise.all([
            withTimeout(
                indexer.getTournament(addrStr, { signal }),
                INDEXER_TIMEOUT_MS,
                "indexer getTournament",
            ),
            withTimeout(
                indexer.getParticipants(addrStr, { signal }),
                INDEXER_TIMEOUT_MS,
                "indexer getParticipants",
            ),
            withTimeout(
                indexer.getMatches(addrStr, { signal }),
                INDEXER_TIMEOUT_MS,
                "indexer getMatches",
            ),
            withTimeout(
                indexer.getPayouts(addrStr, { signal }),
                INDEXER_TIMEOUT_MS,
                "indexer getPayouts",
            ),
            // getSlot is part of the SWR freshness gate — if RPC is so slow
            // it can't return a slot in 3 s, indexer-first is moot.
            withTimeout(
                client.rpc.getSlot().send(),
                INDEXER_TIMEOUT_MS,
                "rpc getSlot",
            ),
        ]);

        const currentSlot = Number(slotResp);

        return {
            bundle: {
                tournament,
                participants,
                matches,
                payouts,
                chainSlotAtWrite: BigInt(tournament.chainSlotAtWrite),
            },
            currentSlot,
        };
    } catch {
        // Indexer / network / timeout — treat as down and let chain take over.
        return null;
    }
}

/**
 * Authoritative chain read. Used as the primary source when:
 *  - indexer is unreachable (down or NEXT_PUBLIC_INDEXER_URL unset)
 *  - indexer row is stale beyond STALE_SLOT_THRESHOLD
 *  - indexer reports tournament not found (404)
 * Also used as the background reconcile after an indexer-served first paint.
 */
async function loadFromChain(
    client: BracketChainClient,
    pda: Address,
    signal: AbortSignal,
): Promise<TournamentView | null> {
    let state: TournamentState;
    try {
        state = await getTournamentState(client, pda);
    } catch {
        // SDK throws UnknownProgramError when the PDA doesn't exist or isn't
        // owned by the program. Treat as not-found (vs. transient error).
        return null;
    }
    if (signal.aborted) throw new Error("aborted");

    // Indexer payouts augment chain state for completed tournaments. Failure
    // here is non-fatal — chain has enough to render most fields.
    let payouts: IndexerPayout[] = [];
    const indexer = getIndexerClient();
    if (indexer) {
        try {
            payouts = await indexer.getPayouts(pda.toString(), { signal });
        } catch {
            // Ignore — indexer down / 404 / network. Chain path stays valid.
        }
    }
    if (signal.aborted) throw new Error("aborted");

    return buildView(state, payouts, PROTOCOL_FEE_BPS);
}

/**
 * Phase 5.3 SWR loader. Tries indexer first (<500 ms target); falls through
 * to chain if indexer is unreachable, stale, or 404s. Either path returns a
 * full TournamentView, so consumers don't need to know which served the read.
 *
 * Spec §6.3 acceptance gates closed by this routine:
 *  - "/t/[address] loads in <500ms from indexer" — indexer path skips RPC
 *  - "Stopping indexer → app continues with RPC fallback (no errors)" —
 *    the catch + null-return path keeps every error path ending in chain
 */
async function loadView(
    client: BracketChainClient,
    pda: Address,
    signal: AbortSignal,
): Promise<TournamentView | null> {
    const indexerResult = await loadFromIndexer(client, pda, signal);
    if (signal.aborted) throw new Error("aborted");

    if (indexerResult) {
        const { bundle, currentSlot } = indexerResult;
        const slotGap = BigInt(currentSlot) - bundle.chainSlotAtWrite;

        // Freshness gate. Negative gaps shouldn't happen but guard anyway.
        // Zero chainSlotAtWrite = legacy row (pre-5.1) — treat as fully stale.
        const isFresh = bundle.chainSlotAtWrite > 0n && slotGap < BigInt(STALE_SLOT_THRESHOLD);

        if (isFresh) {
            // Lean indexer doesn't capture playerA/playerB on Match rows
            // (MatchReported events don't carry them; the reconciliation cron
            // that would backfill is currently disabled). For active/completed
            // tournaments, that produces TBD/TBD bracket cells. Detect missing
            // player data and fall through to chain — the on-chain Match PDA
            // always has both pubkeys populated by start_tournament.
            const needsChainForPlayers = bundle.matches.some(
                (m) => (m.status === "Active" || m.status === "Completed")
                    && (!m.playerA || !m.playerB),
            );

            // Lean-indexer also never seeds Pending matches — they only enter
            // the indexer on MatchReported (Completed). For tournaments past
            // the registration phase the bracket should already exist on-chain
            // (PendingBracketInit / Active) or have completed (Completed), but
            // indexer-only data may show 0 matches until the first report.
            // Without this branch the bracket area renders the generic
            // "Waiting for players..." empty state even when start_tournament
            // has already run and match PDAs exist on-chain.
            const status = bundle.tournament.status;
            const expectsBracket =
                status === "PendingBracketInit" ||
                status === "Active" ||
                status === "Completed";
            const indexerMissingBracket = expectsBracket && bundle.matches.length === 0;

            if (!needsChainForPlayers && !indexerMissingBracket) {
                const adapted = await indexerToTournamentState(
                    pda,
                    client.programAddress,
                    bundle.tournament,
                    bundle.participants,
                    bundle.matches,
                );
                return buildView(adapted, bundle.payouts, PROTOCOL_FEE_BPS);
            }
        }
        // Stale, missing player data, or bracket-shaped but empty — fall
        // through to chain (loadFromChain returns full PDA set including
        // Pending matches that lean indexer doesn't store).
    }

    return loadFromChain(client, pda, signal);
}

export function useTournamentView(id: string) {
    const client = useReadOnlySdkClient();
    const [state, dispatch] = useReducer(reducer, { status: "loading" });
    const [tick, retry] = useReducer((n: number) => n + 1, 0);

    const refresh = useCallback(() => retry(), []);

    useEffect(() => {
        if (!isValidAddress(id)) {
            dispatch({ type: "FETCH_NOT_FOUND" });
            return;
        }
        const pda = address(id);
        const ac = new AbortController();
        let unsubscribe: (() => void) | null = null;
        let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

        dispatch({ type: "FETCH_START" });

        // Refetch helper used by both WS callback and inactivity safety net.
        const refetch = () => {
            loadView(client, pda, ac.signal)
                .then((v) => {
                    if (ac.signal.aborted || !v) return;
                    dispatch({ type: "FETCH_SUCCESS", data: v });
                })
                .catch(() => {
                    // Silent — already-rendered state stays valid.
                });
        };

        // Inactivity-triggered reconciliation. Production Solana clients
        // (Drift v2, kit examples) treat WS notifications as fast-path and
        // fall back to a one-shot RPC fetch when WS is silent past a
        // threshold — covers WS drops, mobile-tab throttling, RPC failover.
        // 30s gives a tight upper bound on UI staleness without burning the
        // free-tier RPC budget.
        const INACTIVITY_MS = 30_000;
        const resetInactivityTimer = () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                if (ac.signal.aborted) return;
                refetch();
                resetInactivityTimer();
            }, INACTIVITY_MS);
        };

        loadView(client, pda, ac.signal)
            .then((view) => {
                if (ac.signal.aborted) return;
                if (!view) {
                    dispatch({ type: "FETCH_NOT_FOUND" });
                    return;
                }
                dispatch({ type: "FETCH_SUCCESS", data: view });

                // Live updates: subscribe to the Tournament account. Every
                // report_result / join CPI bumps a counter on the Tournament
                // PDA, so this fires for every state-change we care about
                // without needing per-match subscriptions.
                unsubscribe = subscribe(
                    client,
                    pda,
                    () => {
                        refetch();
                        resetInactivityTimer();  // WS is alive — push timer back
                    },
                );

                // Arm the safety net after first successful subscribe.
                resetInactivityTimer();
            })
            .catch((err) => {
                if (ac.signal.aborted) return;
                if (err instanceof Error && err.message === "aborted") return;
                dispatch({ type: "FETCH_ERROR" });
            });

        return () => {
            ac.abort();
            if (unsubscribe) unsubscribe();
            if (inactivityTimer) clearTimeout(inactivityTimer);
        };
    }, [client, id, tick]);

    return { state, refresh };
}
