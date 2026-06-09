"use client";

import { useState, useReducer, useEffect, useCallback } from "react";
import { toUiTournament, type Tournament } from "@/lib/tournament";
import { useBracketChainClient, getIndexerClient } from "@/lib/sdk";
import { getTournament, TournamentStatus } from "@bracketchain/sdk";
import type { IndexerTournamentStatus } from "@/lib/indexerClient";
import { address } from "@solana/kit";

const STATUS_TO_INDEXER: Record<TournamentStatus, Tournament["status"]> = {
    [TournamentStatus.Registration]: "Registration",
    [TournamentStatus.PendingBracketInit]: "PendingBracketInit",
    [TournamentStatus.Active]: "Active",
    [TournamentStatus.Completed]: "Completed",
    [TournamentStatus.Cancelled]: "Cancelled",
    [TournamentStatus.PartialCancelled]: "Cancelled",
};

// Synthetic status that doesn't exist on-chain — derived from
// `Registration` status + deadline check on the client side. Lets users find
// tournaments where the deadline has passed but the organizer hasn't yet
// transitioned the on-chain state (Start / Cancel).
export type ExploreStatus = IndexerTournamentStatus | "All" | "RegistrationClosed";

export interface ExploreFilters {
    status: ExploreStatus;
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

        // RegistrationClosed is a synthetic UI bucket — the indexer only knows
        // the on-chain status, so we fetch `Registration` rows and post-filter
        // by deadline.
        const apiStatus =
            filters.status === "All"
                ? undefined
                : filters.status === "RegistrationClosed"
                    ? "Registration"
                    : filters.status;

        const indexer = getIndexerClient();
        if (!indexer) {
            dispatch({ type: "FETCH_ERROR" });
            return () => ac.abort();
        }

        indexer.listTournaments({
            status: apiStatus,
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

                // Split Registration into Upcoming (still open) vs Reg Closed
                // (deadline passed). Without this split the two buckets overlap
                // and Upcoming surfaces tournaments users can no longer join.
                if (filters.status === "RegistrationClosed" || filters.status === "Registration") {
                    const cutoff = Date.now();
                    tournaments = tournaments.filter(t => {
                        const ms = new Date(t.registrationDeadline).getTime();
                        if (!Number.isFinite(ms)) {
                            // Missing/invalid deadline → assume still open so it
                            // doesn't disappear from both filters silently.
                            return filters.status === "Registration";
                        }
                        return filters.status === "RegistrationClosed"
                            ? ms <= cutoff
                            : ms > cutoff;
                    });
                }

                tournaments = tournaments.filter(t =>
                    t.prizePool >= filters.minPrize &&
                    (filters.maxPrize >= 10000 || t.prizePool <= filters.maxPrize)
                );

                if (filters.freeOnly) {
                    tournaments = tournaments.filter(t => t.entryFee === 0);
                }

                const total = tournaments.length;
                let paginatedData = tournaments.slice(offset, offset + limit);
                const paginatedLenBeforeEnrichment = paginatedData.length;
                const hasMore = offset + limit < total;

                // Enrich with live blockchain data for participant counts using SDK
                if (paginatedData.length > 0 && client) {
                    try {
                        await Promise.all(paginatedData.map(async (t) => {
                            if (!t.id || t.id.startsWith("TestPDA") || t.id.length < 32) return;
                            try {
                                const pda = address(t.id);
                                const data = await getTournament(client, pda);
                                if (data) {
                                    const mappedStatus = STATUS_TO_INDEXER[data.status];
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

                // Re-apply status filter after enrichment. The indexer can lag
                // behind on-chain truth (e.g. a tournament cancelled on-chain
                // but the indexer hasn't ingested the event yet). The first
                // status filter ran on indexer-fed status; here we drop rows
                // whose live status no longer matches the active tab.
                if (filters.status !== "All") {
                    const cutoff = Date.now();
                    paginatedData = paginatedData.filter(t => {
                        if (filters.status === "RegistrationClosed") {
                            const ms = new Date(t.registrationDeadline).getTime();
                            return t.status === "Registration"
                                && Number.isFinite(ms)
                                && ms <= cutoff;
                        }
                        if (filters.status === "Registration") {
                            const ms = new Date(t.registrationDeadline).getTime();
                            return t.status === "Registration"
                                && (!Number.isFinite(ms) || ms > cutoff);
                        }
                        return t.status === filters.status;
                    });
                }

                if (ac.signal.aborted) return;

                // Adjust total by the number of rows the post-enrichment
                // filter dropped on this page. Only accounts for the current
                // page (future pages may still have stale-indexer mismatches),
                // but it keeps the header count from claiming more rows than
                // are actually visible.
                const droppedThisPage = paginatedLenBeforeEnrichment - paginatedData.length;
                const adjustedTotal = Math.max(0, total - droppedThisPage);

                dispatch({
                    type: "FETCH_SUCCESS",
                    data: paginatedData,
                    hasMore,
                    total: adjustedTotal,
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