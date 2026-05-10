"use client";

import { useEffect, useReducer, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useBracketChainClient, getIndexerClient } from "@/lib/sdk";
import { getEnumKind, type IndexerTournament, type IndexerTournamentStatus } from "@bracketchain/sdk";
import { PublicKey } from "@solana/web3.js";

const ANCHOR_TO_INDEXER_STATUS: Record<string, IndexerTournamentStatus> = {
    registration: "Registration",
    pendingBracketInit: "PendingBracketInit",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
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

                // ── batch on-chain enrichment ───────────────────────────
                // One getMultipleAccountsInfo RPC for up to 100 tournaments
                // — Anchor decodes each entry server-side via the program's
                // coder and returns null for missing accounts. Replaces the
                // previous N+1 pattern (one getAccountInfo per row).
                if (mine.length > 0 && client) {
                    const validEntries = mine.filter(t => t.address && t.address.length >= 32);
                    const pdas = validEntries.map(t => new PublicKey(t.address));

                    try {
                        const fetched = await client.program.account.tournament.fetchMultiple(pdas);

                        // Race guard: between dispatching FETCH_START and now the user
                        // may have triggered a refetch (e.g. unmounted via wallet
                        // disconnect). The Promise.all variant could mutate `mine`
                        // entries even after the next FETCH_SUCCESS dispatched.
                        // Single check here — fetchMultiple is one atomic RPC, so
                        // there's no per-iteration window to worry about.
                        if (ac.signal.aborted) return;

                        validEntries.forEach((t, i) => {
                            const data = fetched[i];
                            if (!data) return;  // account not found / missing
                            const kind = getEnumKind(data.status as never);
                            t.status = ANCHOR_TO_INDEXER_STATUS[kind] || t.status;
                            // Authoritative count from the Tournament PDA — fixes
                            // indexer derivation for non-completed tournaments
                            // (grossPool null) and for Variant B tournaments with
                            // organizerDeposit > 0 (where grossPool/entryFee
                            // over-counts by deposit/entryFee).
                            t.participantCount = Number(data.participantCount);
                        });
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
