"use client";

import { useEffect, useReducer, useCallback } from "react";

export interface Tournament {
    id: string;
    name: string;
    game: string;
    format: "SE" | "DE" | "Swiss" | "RR";
    prizePool: number;
    participants: number;
    maxParticipants: number;
    startsIn: string;
}

type State =
    | { status: "loading" }
    | { status: "success"; data: Tournament[] }
    | { status: "empty" }
    | { status: "error" };

type Action =
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; data: Tournament[] }
    | { type: "FETCH_ERROR" };

function reducer(_: State, action: Action): State {
    switch (action.type) {
        case "FETCH_START": return { status: "loading" };
        case "FETCH_SUCCESS":
            return action.data.length === 0
                ? { status: "empty" }
                : { status: "success", data: action.data };
        case "FETCH_ERROR": return { status: "error" };
        default: return { status: "loading" };
    }
}

// TODO: replace with real endpoint — GET /api/tournaments?status=live&limit=4
async function fetchLiveTournaments(): Promise<Tournament[]> {
    await new Promise(r => setTimeout(r, 1000));

    // Simulate occasional API failure (10% chance) for demo
    if (Math.random() < 0.1) throw new Error("API unavailable");

    // Return empty array to test empty state:
    // return [];

    return [
        { id: "spring-champ-2025", name: "Spring Championship", game: "Valorant", format: "SE", prizePool: 5000, participants: 28, maxParticipants: 32, startsIn: "2h 15m" },
        { id: "weekend-warriors-lol", name: "Weekend Warriors", game: "League of Legends", format: "DE", prizePool: 2500, participants: 12, maxParticipants: 16, startsIn: "45m" },
        { id: "pro-circuit-finals-cs2", name: "Pro Circuit Finals", game: "CS2", format: "Swiss", prizePool: 10000, participants: 16, maxParticipants: 16, startsIn: "Starting soon" },
        { id: "rookie-rumble-rl", name: "Rookie Rumble", game: "Rocket League", format: "RR", prizePool: 1000, participants: 6, maxParticipants: 8, startsIn: "4h 30m" },
    ];
}

export function useTournaments() {
    const [state, dispatch] = useReducer(reducer, { status: "loading" });
    const [tick, retry] = useReducer((n: number) => n + 1, 0);

    const refresh = useCallback(() => retry(), []);

    useEffect(() => {
        let active = true;

        dispatch({ type: "FETCH_START" });

        fetchLiveTournaments()
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