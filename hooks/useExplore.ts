"use client";

import { useState, useReducer, useEffect, useCallback } from "react";
import { listIndexerTournaments, type IndexerTournamentStatus } from "@/lib/indexer";
import { toUiTournament, type Tournament } from "@/lib/tournament";
import { useBracketChainClient } from "@/lib/sdk";
import { getTournament, getEnumKind } from "@bracketchain/sdk";
import { PublicKey } from "@solana/web3.js";

const ANCHOR_TO_INDEXER_STATUS: Record<string, Tournament["status"]> = {
    registration: "Registration",
    pendingBracketInit: "PendingBracketInit",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
};

export interface ExploreFilters {
    status: IndexerTournamentStatus | "All";
    format: string; // "All", "SE", "DE", "Swiss", "RR"
    minPrize: number;
    maxPrize: number;
    freeOnly: boolean;
    game: string;
    search: string;
}

type State =
    | { status: "loading"; data: Tournament[]; hasMore: boolean; total: number }
    | { status: "success"; data: Tournament[]; hasMore: boolean; total: number }
    | { status: "error"; data: Tournament[]; hasMore: boolean; total: number };

type Action =
    | { type: "FETCH_START"; reset: boolean }
    | { type: "FETCH_SUCCESS"; data: Tournament[]; hasMore: boolean; total: number; append: boolean }
    | { type: "FETCH_ERROR" };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "FETCH_START":
            return {
                ...state,
                status: "loading",
                data: action.reset ? [] : state.data,
            };
        case "FETCH_SUCCESS":
            return {
                status: "success",
                data: action.append ? [...state.data, ...action.data] : action.data,
                hasMore: action.hasMore,
                total: action.total,
            };
        case "FETCH_ERROR":
            return { ...state, status: "error" };
        default:
            return state;
    }
}

export function useExplore(filters: ExploreFilters) {
    const client = useBracketChainClient();
    const [state, dispatch] = useReducer(reducer, {
        status: "loading",
        data: [],
        hasMore: true,
        total: 0,
    });

    const [page, setPage] = useState(0);
    const [tick, retry] = useReducer((n: number) => n + 1, 0);

    const [prevFilters, setPrevFilters] = useState(filters);
    if (filters !== prevFilters) {
        setPrevFilters(filters);
        setPage(0);
    }

    const loadMore = useCallback(() => {
        if (state.status !== "loading" && state.hasMore) {
            setPage(p => p + 1);
        }
    }, [state.status, state.hasMore]);

    const refresh = useCallback(() => retry(), []);

    useEffect(() => {
        const ac = new AbortController();
        const isInitial = page === 0;

        // If we're not on the initial page but filters changed, the previous effect
        // will trigger a page reset. We should skip this fetch and wait for that reset.
        // This is a heuristic: if filters change, we ALWAYS want page 0 first.
        // However, since we can't easily compare filters here without deep equal or refs,
        // we'll rely on the fact that FETCH_START resets data if isInitial is true.
        
        dispatch({ type: "FETCH_START", reset: isInitial });

        const limit = 12;
        const offset = page * limit;

        const apiStatus = filters.status === "All" ? undefined : filters.status;

        listIndexerTournaments({
            status: apiStatus,
            name: filters.search || undefined,
            limit: 100, 
            signal: ac.signal,
        })
            .then(async (rows) => {
                if (ac.signal.aborted) return;

                let tournaments = rows.map(r => toUiTournament(r));

                if (filters.search) {
                    const s = filters.search.toLowerCase();
                    tournaments = tournaments.filter(t => t.name.toLowerCase().includes(s));
                }

                if (filters.format !== "All") {
                    tournaments = tournaments.filter(t => t.format === filters.format);
                }
                if (filters.game !== "All") {
                    tournaments = tournaments.filter(t => t.game === filters.game);
                }
                
                tournaments = tournaments.filter(t => 
                    t.prizePool >= filters.minPrize && 
                    (filters.maxPrize >= 10000 || t.prizePool <= filters.maxPrize)
                );

                if (filters.freeOnly) {
                    tournaments = tournaments.filter(t => t.entryFee === 0);
                }

                const total = tournaments.length;
                const paginatedData = tournaments.slice(offset, offset + limit);
                const hasMore = offset + limit < total;

                // Enrich with live blockchain data for participant counts using SDK
                if (paginatedData.length > 0 && client) {
                    try {
                        await Promise.all(paginatedData.map(async (t) => {
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
                    } catch (err) {
                        console.warn("Failed to enrich participant counts:", err);
                    }
                }

                if (ac.signal.aborted) return;

                dispatch({
                    type: "FETCH_SUCCESS",
                    data: paginatedData,
                    hasMore,
                    total,
                    append: !isInitial,
                });
            })
            .catch(() => {
                if (ac.signal.aborted) return;
                dispatch({ type: "FETCH_ERROR" });
            });

        return () => ac.abort();
    }, [filters, page, tick, client]);

    return { state, loadMore, refresh };
}