"use client";

import { useEffect, useReducer, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { listIndexerTournaments, type IndexerTournament, type IndexerTournamentStatus } from "@/lib/indexer";

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
        listIndexerTournaments({ status: STATUS_MAP[filter], limit: 100, signal: ac.signal })
            .then(rows => {
                if (ac.signal.aborted) return;
                const mine = rows
                    .filter(r => r.organizer === publicKey.toBase58())
                    .map(toEntry);
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
    }, [connected, publicKey, filter, tick]);

    return { state, refresh };
}