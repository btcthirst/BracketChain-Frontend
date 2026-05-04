"use client";

import { useEffect, useReducer, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { listIndexerTournaments, type IndexerTournament, type IndexerTournamentStatus } from "@/lib/indexer";
import { useBracketChainClient } from "@/lib/sdk";
import { getTournament, getEnumKind } from "@bracketchain/sdk";
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

const STATUS_MAP: Record<DashboardFilter, IndexerTournamentStatus | undefined> = {
    all: undefined,
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
};

function toEntry(t: IndexerTournament): DashboardTournament {
    const entryFee = BigInt(t.entryFee);
    const grossPool = t.grossPool != null ? BigInt(t.grossPool) : BigInt(0);
    const participantCount =
        entryFee > 0n && t.grossPool != null
            ? Number(grossPool / entryFee)
            : 0;
    const prizePoolUsdc = Number(grossPool) / USDC_DECIMALS;
    return { ...t, participantCount, prizePoolUsdc };
}

export function useDashboard(filter: DashboardFilter) {
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

        // Fetch all pages the organizer might have — indexer supports
        // organizer filter via query param in future; for MVP fetch all + filter client-side.
        // We do NOT pass `status` to the indexer so we can override stale indexer statuses with fresh on-chain ones.
        listIndexerTournaments({ limit: 100, signal: ac.signal })
            .then(async (rows) => {
                if (ac.signal.aborted) return;
                let mine = rows
                    .filter(r => r.organizer === publicKey.toBase58())
                    .map(toEntry);

                // Enrich with fresh on-chain data to fix indexer lag
                if (mine.length > 0 && client) {
                    try {
                        await Promise.all(mine.map(async (t) => {
                            if (!t.address || t.address.length < 32) return;
                            try {
                                const data = await getTournament(client, new PublicKey(t.address));
                                if (data) {
                                    const kind = getEnumKind(data.status as never);
                                    t.status = ANCHOR_TO_INDEXER_STATUS[kind] || t.status;
                                }
                            } catch (e) {
                                console.warn(`Failed to fetch on-chain status for ${t.address}:`, e);
                            }
                        }));
                    } catch (e) {
                        console.warn("Failed to enrich tournament statuses:", e);
                    }
                }

                // Apply the dashboard filter AFTER enriching
                const targetStatus = STATUS_MAP[filter];
                if (targetStatus) {
                    mine = mine.filter(t => {
                        if (targetStatus === "Active") {
                            return t.status === "PendingBracketInit" || t.status === "Active";
                        }
                        return t.status === targetStatus;
                    });
                }

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
    }, [connected, publicKey, filter, tick, client]);

    return { state, refresh };
}