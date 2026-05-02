"use client";

import { useEffect, useReducer, useCallback } from "react";
import { listIndexerTournaments, type IndexerTournament } from "@/lib/indexer";

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

const USDC_DECIMALS = 1_000_000;

function formatStartsIn(deadlineIso: string): string {
    const deadline = new Date(deadlineIso).getTime();
    const ms = deadline - Date.now();
    if (ms <= 0) return "Registration closed";
    const totalMin = Math.floor(ms / 60_000);
    if (totalMin < 60) return `${totalMin}m`;
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const hoursLeft = hours % 24;
    return hoursLeft > 0 ? `${days}d ${hoursLeft}h` : `${days}d`;
}

function toUiTournament(t: IndexerTournament): Tournament {
    // Prize pool estimate at registration time: entry_fee × max_participants.
    // Once Completed, indexer carries grossPool — prefer that.
    const entryFeeMicro = BigInt(t.entryFee);
    const grossMicro = t.grossPool != null ? BigInt(t.grossPool) : entryFeeMicro * BigInt(t.maxParticipants);
    const prizePool = Number(grossMicro) / USDC_DECIMALS;

    return {
        id: t.address,
        name: t.name,
        // Indexer doesn't track game tag — placeholder until Tournament gains a `game` column (V1).
        game: "On-chain",
        // MVP is single-elim only.
        format: "SE",
        prizePool,
        // Indexer doesn't expose live participant count yet (Tournament account does, but the GET endpoint
        // doesn't surface it). Show 0 until indexer is extended; max still informative.
        participants: 0,
        maxParticipants: t.maxParticipants,
        startsIn: formatStartsIn(t.registrationDeadline),
    };
}

export function useTournaments() {
    const [state, dispatch] = useReducer(reducer, { status: "loading" });
    const [tick, retry] = useReducer((n: number) => n + 1, 0);

    const refresh = useCallback(() => retry(), []);

    useEffect(() => {
        const ac = new AbortController();
        dispatch({ type: "FETCH_START" });

        listIndexerTournaments({ status: "Registration", limit: 4, signal: ac.signal })
            .then(rows => {
                if (ac.signal.aborted) return;
                dispatch({ type: "FETCH_SUCCESS", data: rows.map(toUiTournament) });
            })
            .catch(err => {
                if (ac.signal.aborted) return;
                if (err instanceof Error && err.name === "AbortError") return;
                dispatch({ type: "FETCH_ERROR" });
            });

        return () => ac.abort();
    }, [tick]);

    return { state, refresh };
}
