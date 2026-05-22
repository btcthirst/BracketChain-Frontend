"use client";

import { useEffect, useReducer, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useBracketChainClient, getIndexerClient } from "@/lib/sdk";
import {
    getTournament,
    TournamentStatus,
    type IndexerTournament,
    type IndexerTournamentStatus,
} from "@bracketchain/sdk";
import { address } from "@solana/kit";

const STATUS_TO_INDEXER: Record<TournamentStatus, IndexerTournamentStatus> = {
    [TournamentStatus.Registration]: "Registration",
    [TournamentStatus.PendingBracketInit]: "PendingBracketInit",
    [TournamentStatus.Active]: "Active",
    [TournamentStatus.Completed]: "Completed",
    [TournamentStatus.Cancelled]: "Cancelled",
};

export type DashboardFilter = "all" | "active" | "completed" | "cancelled";

export type DashboardTournament = IndexerTournament & {
    participantCount: number;
    prizePoolUsdc: number;
};

type State =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; data: DashboardTournament[] }
    | { status: "empty" }
    | { status: "error" };

type Action =
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; data: DashboardTournament[] }
    | { type: "FETCH_EMPTY" }
    | { type: "FETCH_ERROR" }
    | { type: "RESET" };

function reducer(_: State, action: Action): State {
    switch (action.type) {
        case "FETCH_START": return { status: "loading" };
        case "FETCH_SUCCESS": return { status: "success", data: action.data };
        case "FETCH_EMPTY": return { status: "empty" };
        case "FETCH_ERROR": return { status: "error" };
        case "RESET": return { status: "idle" };
        default: return { status: "idle" };
    }
}

const USDC_DECIMALS = 1_000_000;

function toEntry(t: IndexerTournament): DashboardTournament {
    const entryFee = BigInt(t.entryFee);
    const organizerDeposit = BigInt(t.organizerDeposit);

    // Variant B (locked decision 2026-05-03): grossPool = entryFee × N + organizerDeposit.
    // To recover participantCount we subtract the deposit before dividing.
    // Clamp to zero defensively — if the indexer ever returns deposit > grossPool
    // (shouldn't happen on-chain, but treat untrusted indexer data carefully).
    // This is a best-effort fallback only; the on-chain enrichment below
    // overwrites it with the authoritative `participant_count` from the
    // Tournament PDA. When the indexer's grossPool is null (Active/Registration
    // tournaments before TournamentCompleted lands) we fall back to
    // organizerDeposit (the on-chain floor) rather than 0 — keeps the
    // dashboard pool from flashing $0 while the indexer catches up.
    const grossPool = t.grossPool != null ? BigInt(t.grossPool) : organizerDeposit;
    const grossEntries = grossPool > organizerDeposit ? grossPool - organizerDeposit : 0n;
    const participantCount =
        entryFee > 0n && t.grossPool != null
            ? Number(grossEntries / entryFee)
            : 0;

    const prizePoolUsdc = Number(grossPool) / USDC_DECIMALS;
    return { ...t, participantCount, prizePoolUsdc };
}

/**
 * Fetches every tournament organized by the connected wallet.
 *
 * Returns the unfiltered list — consumers (DashboardPage) derive the
 * status-filtered view client-side via useMemo. This collapses what used
 * to be two parallel hook instances (one for the table, one for analytics)
 * into a single fetch + enrichment pass.
 *
 * Read path:
 *   1. Indexer GET /tournaments?limit=100 — listing source
 *   2. Filter rows by `organizer === connectedWallet`
 *   3. Batch-fetch fresh Tournament accounts from chain via Anchor's
 *      fetchMultiple ([...pdas]) — single getMultipleAccountsInfo RPC
 *      instead of N separate getAccountInfo calls
 *   4. Overlay on-chain status + participant_count over indexer rows
 *      (fixes indexer lag and Variant B grossPool/entryFee math errors)
 */
export function useDashboard() {
    const { publicKey, connected } = useWallet();
    const client = useBracketChainClient();
    const [state, dispatch] = useReducer(reducer, { status: "idle" });
    const [tick, retry] = useReducer((n: number) => n + 1, 0);

    const refresh = useCallback(() => retry(), []);

    useEffect(() => {
        if (!connected || !publicKey) {
            dispatch({ type: "RESET" });
            return;
        }

        const ac = new AbortController();
        dispatch({ type: "FETCH_START" });

        const indexer = getIndexerClient();
        if (!indexer) {
            dispatch({ type: "FETCH_ERROR" });
            return () => ac.abort();
        }

        indexer.listTournaments({ limit: 100, signal: ac.signal })
            .then(async (rows) => {
                if (ac.signal.aborted) return;
                const mine = rows
                    .filter(r => r.organizer === publicKey.toBase58())
                    .map(toEntry);

                // ── on-chain enrichment ─────────────────────────────────
                // Stage 4 (Kit migration): SDK 0.4.0 no longer exposes an
                // Anchor-style `fetchMultiple` — Codama-generated `fetchTournament`
                // is per-PDA. We fan out with Promise.all; Kit's RPC layer
                // pipelines requests over the same HTTP/2 connection so the
                // round-trip cost is similar to the old getMultipleAccountsInfo
                // batch for typical dashboard sizes (≤100 rows).
                if (mine.length > 0 && client) {
                    const validEntries = mine.filter(t => t.address && t.address.length >= 32);

                    try {
                        await Promise.all(
                            validEntries.map(async (t) => {
                                try {
                                    const data = await getTournament(client, address(t.address));
                                    if (!data) return;
                                    t.status = STATUS_TO_INDEXER[data.status] || t.status;
                                    // Authoritative count from the Tournament PDA — fixes
                                    // indexer derivation for non-completed tournaments
                                    // (grossPool null) and for Variant B tournaments with
                                    // organizerDeposit > 0 (where grossPool/entryFee
                                    // over-counts by deposit/entryFee).
                                    t.participantCount = Number(data.participantCount);
                                } catch {
                                    // Per-row failure — ignore; row keeps indexer-derived values.
                                }
                            }),
                        );

                        // Race guard: between dispatching FETCH_START and now the user
                        // may have triggered a refetch (e.g. unmounted via wallet
                        // disconnect). Check once after the Promise.all resolves.
                        if (ac.signal.aborted) return;
                    } catch (e) {
                        // Enrichment is best-effort; fall back to indexer-derived values.
                        console.warn("Batch on-chain enrichment failed:", e);
                    }
                }

                if (ac.signal.aborted) return;
                if (mine.length === 0) {
                    dispatch({ type: "FETCH_EMPTY" });
                } else {
                    dispatch({ type: "FETCH_SUCCESS", data: mine });
                }
            })
            .catch(err => {
                if (ac.signal.aborted) return;
                if (err instanceof Error && err.name === "AbortError") return;
                dispatch({ type: "FETCH_ERROR" });
            });

        return () => ac.abort();
    }, [connected, publicKey, tick, client]);

    return { state, refresh };
}
