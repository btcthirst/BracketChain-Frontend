"use client";

import { useEffect, useReducer, useCallback } from "react";
import type { TournamentView } from "@/types/tournament";

// ── Mock data factory ─────────────────────────────────────────────────────────

function makeMockTournament(id: string): TournamentView {
    const players = Array.from({ length: 12 }, (_, i) => ({
        address: `Player${i}PublicKeyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX${i}`,
        display: `${["Ab3d", "Xy9z", "Mn2w", "Qr7p", "Zk4t", "Lv8s", "Wj5n", "Hc1r", "Uf6m", "Dg3k", "Bt9e", "Ys2x"][i]}…${["xY9z", "aB3c", "pQ7r", "nM2w", "kZ4t", "sL8v", "nW5j", "rH1c", "mU6f", "kD3g", "eB9t", "xY2s"][i]}`,
        isOrganizer: i === 0,
    }));

    const organizer = players[0];

    const matches = [
        // Round 1
        { id: "m1", round: 1, position: 0, playerA: players[0], playerB: players[1], winner: players[0], status: "completed" as const, result: { scoreA: 2, scoreB: 0, txSignature: "5xK2mN…tx1", timestamp: "2025-05-01T10:00:00Z" } },
        { id: "m2", round: 1, position: 1, playerA: players[2], playerB: players[3], winner: players[3], status: "completed" as const, result: { scoreA: 1, scoreB: 2, txSignature: "7yL3pQ…tx2", timestamp: "2025-05-01T10:30:00Z" } },
        { id: "m3", round: 1, position: 2, playerA: players[4], playerB: players[5], winner: null, status: "in_progress" as const, result: null },
        { id: "m4", round: 1, position: 3, playerA: players[6], playerB: players[7], winner: null, status: "pending" as const, result: null },
        // Round 2
        { id: "m5", round: 2, position: 0, playerA: players[0], playerB: players[3], winner: null, status: "pending" as const, result: null },
        { id: "m6", round: 2, position: 1, playerA: null, playerB: null, winner: null, status: "pending" as const, result: null },
        // Final
        { id: "m7", round: 3, position: 0, playerA: null, playerB: null, winner: null, status: "pending" as const, result: null },
    ];

    return {
        id,
        name: "Spring Championship 2025",
        game: "Valorant",
        format: "SE",
        status: "in_progress",
        prizePool: 5000,
        token: "USDC",
        entryFee: 10,
        maxParticipants: 16,
        participants: players,
        matches,
        payouts: [
            { place: 1, label: "1st", pct: 60, amount: 2907, recipient: null, txSignature: null },
            { place: 2, label: "2nd", pct: 25, amount: 1212.5, recipient: null, txSignature: null },
            { place: 3, label: "3rd", pct: 15, amount: 727.5, recipient: null, txSignature: null },
        ],
        organizer,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        cancelledTxSignature: null,
        refundTxSignatures: [],
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

// TODO: replace with real API — GET /api/tournaments/:id
// with fallback to RPC if stale (>30s)
async function fetchTournament(id: string): Promise<TournamentView | null> {
    await new Promise(r => setTimeout(r, 900));
    if (id === "not-found") return null;
    return makeMockTournament(id);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTournamentView(id: string) {
    const [state, dispatch] = useReducer(reducer, { status: "loading" });
    const [tick, retry] = useReducer((n: number) => n + 1, 0);

    const refresh = useCallback(() => retry(), []);

    useEffect(() => {
        let active = true;
        dispatch({ type: "FETCH_START" });

        fetchTournament(id)
            .then(data => {
                if (!active) return;
                if (!data) dispatch({ type: "FETCH_NOT_FOUND" });
                else dispatch({ type: "FETCH_SUCCESS", data });
            })
            .catch(() => {
                if (active) dispatch({ type: "FETCH_ERROR" });
            });

        return () => { active = false; };
    }, [id, tick]);

    return { state, refresh };
}