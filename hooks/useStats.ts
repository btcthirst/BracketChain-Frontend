"use client";

import { useEffect, useReducer, useCallback } from "react";

export interface StatsData {
    tournamentsCreated: number;
    totalPrizeVolume: number;
    gamesIntegrated: number;
    avgPayoutSeconds: number;
}

type State =
    | { status: "loading" }
    | { status: "success"; data: StatsData }
    | { status: "error" };

type Action =
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; data: StatsData }
    | { type: "FETCH_ERROR" };

function reducer(_: State, action: Action): State {
    switch (action.type) {
        case "FETCH_START": return { status: "loading" };
        case "FETCH_SUCCESS": return { status: "success", data: action.data };
        case "FETCH_ERROR": return { status: "error" };
        default: return { status: "loading" };
    }
}

// TODO: replace with real endpoint — GET /api/stats
async function fetchStats(): Promise<StatsData> {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1200));

    // Simulate occasional API failure (10% chance) for demo
    if (Math.random() < 0.1) throw new Error("API unavailable");

    return {
        tournamentsCreated: 1247,
        totalPrizeVolume: 892500,
        gamesIntegrated: 12,
        avgPayoutSeconds: 8,
    };
}

export function useStats() {
    const [state, dispatch] = useReducer(reducer, { status: "loading" });
    const [tick, retry] = useReducer((n: number) => n + 1, 0);

    const refresh = useCallback(() => retry(), []);

    useEffect(() => {
        let active = true;

        dispatch({ type: "FETCH_START" });

        fetchStats()
            .then(data => {
                if (active) dispatch({ type: "FETCH_SUCCESS", data });
            })
            .catch(() => {
                if (active) dispatch({ type: "FETCH_ERROR" });
            });

        return () => { active = false; };
    }, [tick]);

    return { state, refresh };
}