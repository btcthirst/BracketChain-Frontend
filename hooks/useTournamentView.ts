"use client";

import { useEffect, useReducer, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import {
    getEnumKind,
    getTournamentState,
    subscribe,
    type BracketChainClient,
    type MatchNode,
    type MatchNodeWithAddress,
    type ParticipantWithAddress,
    type Tournament,
    type TournamentState,
    type TournamentStatusKind,
} from "@bracketchain/sdk";

import { useReadOnlySdkClient } from "@/lib/sdk";
import { getIndexerPayouts, type IndexerPayout } from "@/lib/indexer";
import type {
    Match,
    Player,
    PayoutDistribution,
    TournamentStatus,
    TournamentView,
} from "@/types/tournament";

// ── Constants ─────────────────────────────────────────────────────────────────

const USDC_DECIMALS = 1_000_000;
const MAX_PARTICIPANTS = 128;
const MIN_PARTICIPANTS = 2;

// Anchor enum index → preset key. Mirrors PayoutPreset on-chain.
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

const STATUS_MAP: Record<TournamentStatusKind, TournamentStatus> = {
    registration: "registration",
    pendingBracketInit: "in_progress",
    active: "in_progress",
    completed: "completed",
    cancelled: "cancelled",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(addr: string): string {
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function isValidPubkey(s: string): boolean {
    try {
        new PublicKey(s);
        return true;
    } catch {
        return false;
    }
}

function isZeroPubkey(pk: PublicKey): boolean {
    return pk.equals(PublicKey.default);
}

function makePlayer(address: string, organizerAddress: string): Player {
    return {
        address,
        display: truncate(address),
        isOrganizer: address === organizerAddress,
    };
}

function findPlayerByAddress(
    pk: PublicKey,
    participants: ParticipantWithAddress[],
    organizerAddress: string,
): Player | null {
    if (isZeroPubkey(pk)) return null;
    const addr = pk.toBase58();
    const known = participants.find((p) => p.account.wallet.equals(pk));
    if (!known) return null;
    return makePlayer(addr, organizerAddress);
}

function buildMatch(
    node: MatchNode,
    participants: ParticipantWithAddress[],
    organizerAddress: string,
    index: number,
): Match {
    const status = getEnumKind(node.status as never) as
        | "pending"
        | "active"
        | "completed";
    return {
        id: `r${node.round}-m${node.matchIndex}-${index}`,
        round: node.round + 1, // on-chain rounds are 0-indexed; UI is 1-indexed
        position: node.matchIndex,
        playerA: findPlayerByAddress(node.playerA, participants, organizerAddress),
        playerB: findPlayerByAddress(node.playerB, participants, organizerAddress),
        winner: findPlayerByAddress(node.winner, participants, organizerAddress),
        status: status === "active" ? "in_progress" : status,
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
            recipientAddress && participants.some((p) => p.account.wallet.toBase58() === recipientAddress)
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
    const organizerAddress = t.organizer.toBase58();
    const address = state.address.toBase58();

    // Defensive: clamp on-chain values into known-safe ranges before using them.
    // Treat on-chain data as untrusted (account could be malformed in adversarial setups).
    let maxParticipants = Math.max(
        MIN_PARTICIPANTS,
        Math.min(MAX_PARTICIPANTS, Number(t.maxParticipants) || MIN_PARTICIPANTS),
    );

    const status = STATUS_MAP[getEnumKind(t.status as never) as TournamentStatusKind];

    // DEBUG OVERRIDE: Shorten specific tournament for testing (only during registration)
    if (address === "DRVqTngSGUsrmZQZvbw1xQ2fkxcx2hEq9uXt7pvu4yHg" && status === "registration") {
        maxParticipants = 2;
    }
    const presetKind = getEnumKind(t.payoutPreset as never) as keyof typeof PAYOUT_PRESETS;

    const entryFeeUsdc = Number(t.entryFee.toString()) / USDC_DECIMALS;
    const participantCount = state.participants.length;
    // Variant B (plan 2026-05-03 decision): organizer_deposit goes INTO the
    // prize pool and is distributed via the preset on completion. It's only
    // refunded on cancel, so subtract it back out once the cancel handler has
    // marked it refunded.
    const depositRefunded = status === "cancelled" && Boolean(t.organizerDepositRefunded);
    const organizerDepositUsdc = depositRefunded
        ? 0
        : Number(t.organizerDeposit.toString()) / USDC_DECIMALS;
    const grossPoolUsdc = entryFeeUsdc * participantCount + organizerDepositUsdc;

    const players: Player[] = state.participants.map((p) =>
        makePlayer(p.account.wallet.toBase58(), organizerAddress),
    );

    const matches: Match[] = state.bracket.map((b: MatchNodeWithAddress, i) =>
        buildMatch(b.account, state.participants, organizerAddress, i),
    );

    const refundTxSignatures = payouts
        .filter((p) => p.kind === "Refund")
        .map((p) => p.txSignature);

    // Bracket-init progress. On-chain `matches_initialized` ramps up across
    // start_tournament chunks; report_result requires status === Active, which
    // only fires once the last chunk lands. Surface explicitly so UI can gate
    // the report flow even though the status pill says "in_progress" already.
    const matchesInitialized = Number(t.matchesInitialized) || 0;
    const totalMatches = Number(t.totalMatches) || 0;
    const onChainStatusKind = getEnumKind(t.status as never) as TournamentStatusKind;
    const bracketReady =
        onChainStatusKind === "active" ||
        onChainStatusKind === "completed" ||
        (totalMatches > 0 && matchesInitialized >= totalMatches);

    return {
        id: state.address.toBase58(),
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
        startTime: new Date(Number(t.createdAt.toString()) * 1000).toISOString(),
        registrationDeadline: new Date(Number(t.registrationDeadline.toString()) * 1000).toISOString(),
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

function reducer(_: State, action: Action): State {
    switch (action.type) {
        case "FETCH_START": return { status: "loading" };
        case "FETCH_SUCCESS": return { status: "success", data: action.data };
        case "FETCH_NOT_FOUND": return { status: "not_found" };
        case "FETCH_ERROR": return { status: "error" };
        default: return { status: "loading" };
    }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const PROTOCOL_FEE_BPS = 350; // 3.5% — matches on-chain ProtocolConfig default.

async function loadView(
    client: BracketChainClient,
    pda: PublicKey,
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

    // Indexer payouts only matter once the tournament has terminal payouts on
    // chain — fetch eagerly but don't fail the whole load if indexer is down.
    let payouts: IndexerPayout[] = [];
    try {
        payouts = await getIndexerPayouts(pda.toBase58(), { signal });
    } catch {
        // Ignore — indexer is a cache, not source of truth.
    }
    if (signal.aborted) throw new Error("aborted");

    return buildView(state, payouts, PROTOCOL_FEE_BPS);
}

export function useTournamentView(id: string) {
    const client = useReadOnlySdkClient();
    const [state, dispatch] = useReducer(reducer, { status: "loading" });
    const [tick, retry] = useReducer((n: number) => n + 1, 0);

    const refresh = useCallback(() => retry(), []);

    useEffect(() => {
        if (!isValidPubkey(id)) {
            dispatch({ type: "FETCH_NOT_FOUND" });
            return;
        }
        const pda = new PublicKey(id);
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
                unsubscribe = subscribe(client, pda, () => {
                    refetch();
                    resetInactivityTimer();  // WS is alive — push timer back
                });

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
