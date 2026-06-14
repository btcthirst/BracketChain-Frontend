"use client";

import { useEffect, useReducer, useCallback } from "react";
import type { IndexerPlayer } from "@/lib/indexerClient";
import { getPlayer } from "@/lib/playerSource";

type State =
    | { status: "loading" }
    | { status: "success"; data: IndexerPlayer }
    | { status: "error" };

type Action =
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; data: IndexerPlayer }
    | { type: "FETCH_ERROR" };

function reducer(_state: State, action: Action): State {
    switch (action.type) {
        case "FETCH_START":
            return { status: "loading" };
        case "FETCH_SUCCESS":
            return { status: "success", data: action.data };
        case "FETCH_ERROR":
            return { status: "error" };
        default:
            return _state;
    }
}

/**
 * Loads an aggregated player profile (stats + tournament history) for a wallet
 * via lib/playerSource (mock now, indexer endpoint later). Read-only — works
 * for any address, no auth required.
 */
export function usePlayerProfile(wallet: string | null) {
    const [state, dispatch] = useReducer(reducer, { status: "loading" });
    const [tick, retry] = useReducer((n: number) => n + 1, 0);

    const refresh = useCallback(() => retry(), []);

    useEffect(() => {
        if (!wallet) return;

        const ac = new AbortController();
        dispatch({ type: "FETCH_START" });

        getPlayer(wallet, { signal: ac.signal })
            .then((data) => {
                if (ac.signal.aborted) return;
                dispatch({ type: "FETCH_SUCCESS", data });
            })
            .catch((err) => {
                if (ac.signal.aborted) return;
                if (err instanceof Error && err.name === "AbortError") return;
                console.error("[usePlayerProfile]", err);
                dispatch({ type: "FETCH_ERROR" });
            });

        return () => ac.abort();
    }, [wallet, tick]);

    return { state, refresh };
}
