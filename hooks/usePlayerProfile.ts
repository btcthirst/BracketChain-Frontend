"use client";

import { useEffect, useReducer, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useReadOnlySdkClient } from "@/lib/sdk";
import { listIndexerTournaments, getPlayerPayouts } from "@/lib/indexer";
import type { PlayerProfileData, PlayerTournamentHistory, PlayerStats } from "@/types/player";

type State =
    | { status: "loading" }
    | { status: "success"; data: PlayerProfileData }
    | { status: "empty" }
    | { status: "not_found" }
    | { status: "error" };

type Action =
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; data: PlayerProfileData }
    | { type: "FETCH_EMPTY" }
    | { type: "FETCH_NOT_FOUND" }
    | { type: "FETCH_ERROR" };

function reducer(_: State, action: Action): State {
    switch (action.type) {
        case "FETCH_START": return { status: "loading" };
        case "FETCH_SUCCESS": return { status: "success", data: action.data };
        case "FETCH_EMPTY": return { status: "empty" };
        case "FETCH_NOT_FOUND": return { status: "not_found" };
        case "FETCH_ERROR": return { status: "error" };
        default: return { status: "loading" };
    }
}

const USDC_DECIMALS = 1_000_000;

export function usePlayerProfile(wallet: string) {
    const client = useReadOnlySdkClient();
    const [state, dispatch] = useReducer(reducer, { status: "loading" });
    const [tick, retry] = useReducer((n: number) => n + 1, 0);

    const refresh = useCallback(() => retry(), []);

    useEffect(() => {
        if (!wallet) return;

        let active = true;
        const ac = new AbortController();

        async function load() {
            dispatch({ type: "FETCH_START" });

            try {
                const payouts = await getPlayerPayouts(wallet, { signal: ac.signal });
                
                // For participation history, ideally we'd have a participant filter in the indexer.
                // For now, let's derive what we can from payouts and potentially 
                // all tournaments (though filtering all is slow).
                
                // Let's assume we can fetch all tournaments for now and filter.
                // In a production app, this would be a specific indexer endpoint.
                const allTournaments = await listIndexerTournaments({ limit: 100, signal: ac.signal });
                
                // Calculate stats
                let totalEarned = 0;
                let wins = 0;
                const history: PlayerTournamentHistory[] = [];

                for (const p of payouts) {
                    if (p.kind === "Prize") {
                        totalEarned += Number(BigInt(p.amount)) / USDC_DECIMALS;
                        if (p.placement === 1) wins++;
                    }
                }

                // Map tournaments to history
                // Note: This only finds tournaments where the player got a payout.
                // In a real app, we'd need participation data too.
                for (const t of allTournaments) {
                    const playerPayouts = payouts.filter(p => p.tournamentAddress === t.address);
                    const participated = playerPayouts.length > 0; // Fallback: if they got a payout, they participated.
                    
                    if (participated) {
                        const mainPayout = playerPayouts.find(p => p.kind === "Prize");
                        history.push({
                            id: t.address,
                            name: t.name,
                            date: t.createdAt,
                            format: "SE", // MVP default
                            placement: mainPayout?.placement ? `${mainPayout.placement}${getOrdinal(mainPayout.placement)}` : "Participant",
                            prizeWon: mainPayout ? Number(BigInt(mainPayout.amount)) / USDC_DECIMALS : 0,
                            game: "On-chain",
                            status: t.status === "Completed" ? "completed" : t.status === "Cancelled" ? "cancelled" : "in_progress",
                        });
                    }
                }

                const stats: PlayerStats = {
                    tournamentsPlayed: history.length, // Simplified for MVP
                    wins,
                    losses: history.filter(h => h.status === "completed" && h.placement !== "1st").length,
                    winRate: history.length > 0 ? Math.round((wins / history.length) * 100) : 0,
                    totalEarned,
                };

                const data: PlayerProfileData = {
                    wallet,
                    stats,
                    history,
                    badges: [], // V2
                };

                if (data.history.length === 0 && data.stats.tournamentsPlayed === 0) {
                    dispatch({ type: "FETCH_EMPTY" });
                } else {
                    dispatch({ type: "FETCH_SUCCESS", data });
                }

            } catch (err) {
                console.error("Failed to load player profile:", err);
                if (active) {
                    // Check if wallet is valid
                    try {
                        new PublicKey(wallet);
                        dispatch({ type: "FETCH_ERROR" });
                    } catch {
                        dispatch({ type: "FETCH_NOT_FOUND" });
                    }
                }
            }
        }

        load();

        return () => {
            active = false;
            ac.abort();
        };
    }, [wallet, tick, client]);

    return { state, refresh };
}

function getOrdinal(n: number) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}
