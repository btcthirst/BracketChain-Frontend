"use client";

import { useBracketChainClient, getIndexerClient } from "@/lib/sdk";
import { toUiTournament, type Tournament } from "@/lib/tournament";
import { getTournament, getEnumKind } from "@bracketchain/sdk";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useReducer } from "react";

const ANCHOR_TO_INDEXER_STATUS: Record<string, Tournament["status"]> = {
    registration: "Registration",
    pendingBracketInit: "PendingBracketInit",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
};

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
    | { type: "ENRICH_DATA"; data: Tournament[] };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "FETCH_START": return { status: "loading" };
        case "FETCH_SUCCESS":
            return action.data.length === 0
                ? { status: "empty" }
                : { status: "success", data: action.data };
        case "FETCH_ERROR": return { status: "error" };
        case "ENRICH_DATA":
            if (state.status !== "success") return state;
            return action.data.length === 0
                ? { status: "empty" }
                : { status: "success", data: action.data };
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

        const indexer = getIndexerClient();
        if (!indexer) {
            dispatch({ type: "FETCH_ERROR" });
            return () => ac.abort();
        }

        indexer.listTournaments({ status: "Registration", limit: 4, signal: ac.signal })
            .then(async (rows) => {
                if (ac.signal.aborted) return;
                const tournaments = rows.map(r => toUiTournament(r));
                dispatch({ type: "FETCH_SUCCESS", data: tournaments });

                // Enrich with live blockchain data for participant counts using SDK
                if (tournaments.length > 0 && client) {
                    try {
                        await Promise.all(tournaments.map(async (t) => {
                            if (!t.id || t.id.startsWith("TestPDA") || t.id.length < 32) return;
                            try {
                                const pubkey = new PublicKey(t.id);
                                const data = await getTournament(client, pubkey);
                                if (data) {
                                    t.participants = data.participantCount;
                                    const kind = getEnumKind(data.status as never);
                                    const mappedStatus = ANCHOR_TO_INDEXER_STATUS[kind];
                                    if (mappedStatus) {
                                        t.status = mappedStatus;
                                    }
                                }
                            } catch (e) {
                                console.warn(`Failed to fetch data for ${t.id}:`, e);
                            }
                        }));

                        // Filter out tournaments that are no longer in Registration
                        // (e.g. indexer returned a cancelled tournament because it hasn't caught up)
                        const validTournaments = tournaments.filter(t => t.status === "Registration");

                        if (!ac.signal.aborted) {
                            dispatch({ type: "ENRICH_DATA", data: validTournaments });
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
