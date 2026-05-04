"use client";

import { useReducer, useEffect, useCallback } from "react";
import { listIndexerTournaments, type IndexerTournamentStatus } from "@/lib/indexer";
import { toUiTournament, type Tournament } from "@/lib/tournament";

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
    const [state, dispatch] = useReducer(reducer, {
        status: "loading",
        data: [],
        hasMore: true,
        total: 0,
    });

    const [page, setPage] = useReducer((n: number) => n + 1, 0);
    const [tick, retry] = useReducer((n: number) => n + 1, 0);

    const loadMore = useCallback(() => {
        if (state.status !== "loading" && state.hasMore) {
            setPage();
        }
    }, [state.status, state.hasMore]);

    const refresh = useCallback(() => retry(), []);

    useEffect(() => {
        const ac = new AbortController();
        const isInitial = page === 0;
        
        dispatch({ type: "FETCH_START", reset: isInitial });

        const limit = 12;
        const offset = page * limit;

        const apiStatus = filters.status === "All" ? undefined : filters.status;

        listIndexerTournaments({
            status: apiStatus,
            name: filters.search || undefined,
            format: filters.format === "All" ? undefined : filters.format,
            game: filters.game === "All" ? undefined : filters.game,
            minPrize: filters.minPrize,
            maxPrize: filters.maxPrize >= 10000 ? undefined : filters.maxPrize,
            freeOnly: filters.freeOnly,
            limit,
            offset,
            signal: ac.signal,
        })
            .then((rows) => {
                if (ac.signal.aborted) return;
                
                const tournaments = rows.map(r => toUiTournament(r));
                // In a real app, the API would return the total count.
                // For MVP, we simulate total count and hasMore.
                const total = 47; // Mock total count
                const hasMore = rows.length === limit;

                dispatch({
                    type: "FETCH_SUCCESS",
                    data: tournaments,
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
    }, [filters, page, tick]);

    return { state, loadMore, refresh };
}
