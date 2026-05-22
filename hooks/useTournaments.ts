"use client";

import { useBracketChainClient, getIndexerClient } from "@/lib/sdk";
import { toUiTournament, type Tournament } from "@/lib/tournament";
import { getTournament, TournamentStatus } from "@bracketchain/sdk";
import { address } from "@solana/kit";
import { useCallback, useEffect, useReducer } from "react";

const STATUS_TO_INDEXER: Record<TournamentStatus, Tournament["status"]> = {
    [TournamentStatus.Registration]: "Registration",
    [TournamentStatus.PendingBracketInit]: "PendingBracketInit",
    [TournamentStatus.Active]: "Active",
    [TournamentStatus.Completed]: "Completed",
    [TournamentStatus.Cancelled]: "Cancelled",
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

        // "Live now" = anything that isn't terminal. Includes Registration
        // (open for join), PendingBracketInit (just started, chunked init),
        // and Active (matches happening). Server returns newest-first by
        // createdAt; we over-fetch (limit 20) and client-side filter to live
        // statuses so the homepage doesn't go empty when all open-for-join
        // tournaments have just started.
        indexer.listTournaments({ limit: 20, signal: ac.signal })
            .then(async (rows) => {
                if (ac.signal.aborted) return;
                const tournaments = rows
                    .map(r => toUiTournament(r))
                    .filter(t =>
                        t.status === "Registration" ||
                        t.status === "PendingBracketInit" ||
                        t.status === "Active"
                    )
                    .slice(0, 4);
                dispatch({ type: "FETCH_SUCCESS", data: tournaments });

                // Enrich with live blockchain data for participant counts using SDK
                if (tournaments.length > 0 && client) {
                    try {
                        await Promise.all(tournaments.map(async (t) => {
                            if (!t.id || t.id.startsWith("TestPDA") || t.id.length < 32) return;
                            try {
                                const pda = address(t.id);
                                const data = await getTournament(client, pda);
                                if (data) {
                                    t.participants = data.participantCount;
                                    const mappedStatus = STATUS_TO_INDEXER[data.status];
                                    if (mappedStatus) {
                                        t.status = mappedStatus;
                                    }
                                }
                            } catch (e) {
                                console.warn(`Failed to fetch data for ${t.id}:`, e);
                            }
                        }));

                        // Filter out tournaments that are no longer live after
                        // chain-side reconciliation (e.g. indexer returned a
                        // Registration row but chain shows it just transitioned
                        // to Completed/Cancelled). Keep all three live statuses
                        // — Registration / PendingBracketInit / Active.
                        const validTournaments = tournaments.filter(t =>
                            t.status === "Registration" ||
                            t.status === "PendingBracketInit" ||
                            t.status === "Active"
                        );

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
