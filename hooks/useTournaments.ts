"use client";

import { useBracketChainClient } from "@/lib/sdk";
import { listIndexerTournaments } from "@/lib/indexer";
import { toUiTournament, type Tournament } from "@/lib/tournament";
import { getTournament } from "@bracketchain/sdk";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useReducer } from "react";

export type { Tournament };

type State =
    | { status: "loading" }
    | { status: "success"; data: Tournament[] }
    | { status: "empty" }
    | { status: "error" };

type Action =
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; data: Tournament[] }
    | { type: "FETCH_ERROR" }
    | { type: "UPDATE_PARTICIPANTS"; counts: Record<string, number> };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "FETCH_START": return { status: "loading" };
        case "FETCH_SUCCESS":
            return action.data.length === 0
                ? { status: "empty" }
                : { status: "success", data: action.data };
        case "FETCH_ERROR": return { status: "error" };
        case "UPDATE_PARTICIPANTS":
            if (state.status !== "success") return state;
            return {
                ...state,
                data: state.data.map(t => ({
                    ...t,
                    participants: action.counts[t.id] ?? t.participants
                }))
            };
        default: return state;
    }
}

export function useTournaments() {
    const client = useBracketChainClient();
    const [state, dispatch] = useReducer(reducer, { status: "loading" });
    const [tick, retry] = useReducer((n: number) => n + 1, 0);

    const refresh = useCallback(() => retry(), []);
    useEffect(() => {
        const ac = new AbortController();
        dispatch({ type: "FETCH_START" });

        listIndexerTournaments({ status: "Registration", limit: 4, signal: ac.signal })
            .then(async (rows) => {
                if (ac.signal.aborted) return;
                const tournaments = rows.map(r => toUiTournament(r));
                dispatch({ type: "FETCH_SUCCESS", data: tournaments });

                // Enrich with live blockchain data for participant counts using SDK
                if (tournaments.length > 0 && client) {
                    try {
                        const counts: Record<string, number> = {};

                        await Promise.all(tournaments.map(async (t) => {
                            if (!t.id || t.id.startsWith("TestPDA") || t.id.length < 32) return;
                            try {
                                const pubkey = new PublicKey(t.id);
                                const data = await getTournament(client, pubkey);
                                if (data) {
                                    counts[t.id] = data.participantCount;
                                }
                            } catch (e) {
                                console.warn(`Failed to fetch count for ${t.id}:`, e);
                            }
                        }));

                        if (!ac.signal.aborted) {
                            dispatch({ type: "UPDATE_PARTICIPANTS", counts });
                        }
                    } catch (err) {
                        console.warn("Failed to enrich participant counts:", err);
                    }
                }
            })
            .catch(err => {
                if (ac.signal.aborted) return;
                if (err instanceof Error && err.name === "AbortError") return;
                dispatch({ type: "FETCH_ERROR" });
            });

        return () => ac.abort();
    }, [tick, client]);

    return { state, refresh };
}
