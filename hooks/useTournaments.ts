"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { listIndexerTournaments } from "@/lib/indexer";
import { toUiTournament, type Tournament } from "@/lib/tournament";
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

/** Offset to `participantCount: u16` in Tournament account data (8 discriminator + 84 fields) */
const PARTICIPANT_COUNT_OFFSET = 92;

export function useTournaments() {
    const { connection } = useConnection();
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

                // Enrich with live blockchain data for participant counts
                if (tournaments.length > 0) {
                    try {
                        const keys = tournaments.map(t => {
                            try {
                                return t.id && t.id.length >= 32 ? new PublicKey(t.id) : null;
                            } catch {
                                return null;
                            }
                        })
                            .filter((key): key is PublicKey => key !== null)
                        const infos = await connection.getMultipleAccountsInfo(keys);
                        const counts: Record<string, number> = {};

                        infos.forEach((info, i) => {
                            if (info && info.data.length >= PARTICIPANT_COUNT_OFFSET + 2) {
                                // Read u16 Little Endian
                                const count = info.data.readUInt16LE(PARTICIPANT_COUNT_OFFSET);
                                counts[tournaments[i].id] = count;
                            }
                        });

                        dispatch({ type: "UPDATE_PARTICIPANTS", counts });
                    } catch (err) {
                        console.warn("Failed to enrich participant counts from blockchain:", err);
                    }
                }
            })
            .catch(err => {
                if (ac.signal.aborted) return;
                if (err instanceof Error && err.name === "AbortError") return;
                dispatch({ type: "FETCH_ERROR" });
            });

        return () => ac.abort();
    }, [tick, connection]);

    return { state, refresh };
}
