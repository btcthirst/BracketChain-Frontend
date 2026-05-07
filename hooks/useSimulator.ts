"use client";

/**
 * useSimulator.ts
 *
 * Self-contained simulation engine for the SE-demo tournament format.
 * Operates entirely on the existing Match[] / Player[] types from @/types/tournament —
 * no mock data, no separate state shape. The hook receives real matches + players
 * from useTournamentView and drives them through the bracket automatically.
 *
 * Algorithm:
 *   1. On `start()` — scan round 1 for pending matches, mark as in_progress
 *   2. After MATCH_REVEAL_MS — pick winner via weighted-random (skill rating)
 *   3. Propagate winner into next-round slot
 *   4. After all round matches complete + ROUND_PAUSE_MS — advance to next round
 *   5. On final match completion — dispatch "done" with champion
 *
 * Timing (configurable via SimSpeed):
 *   slow   → 3600ms per match stagger, 2000ms round pause
 *   normal → 1800ms / 1200ms
 *   fast   → 800ms / 600ms
 *   turbo  → 300ms / 200ms
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Match, Player } from "@/types/tournament";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SimSpeed = "slow" | "normal" | "fast" | "turbo";

export const SIM_SPEEDS: Record<SimSpeed, { label: string; matchMs: number; roundPauseMs: number }> = {
    slow: { label: "Slow", matchMs: 3600, roundPauseMs: 2000 },
    normal: { label: "Normal", matchMs: 1800, roundPauseMs: 1200 },
    fast: { label: "Fast", matchMs: 800, roundPauseMs: 600 },
    turbo: { label: "Turbo", matchMs: 300, roundPauseMs: 200 },
};

export type SimPhase = "idle" | "running" | "paused" | "done";

export interface SimulatorState {
    phase: SimPhase;
    /** 1-indexed round currently being processed */
    currentRound: number;
    /** Final winner once phase === "done" */
    champion: Player | null;
    speed: SimSpeed;
    /** Live copy of matches, mutated as simulation progresses */
    matches: Match[];
}

type SimAction =
    | { type: "START"; matches: Match[] }
    | { type: "PAUSE" }
    | { type: "RESUME" }
    | { type: "SET_SPEED"; speed: SimSpeed }
    | { type: "PATCH_MATCHES"; matches: Match[] }
    | { type: "ADVANCE_ROUND"; round: number }
    | { type: "FINISH"; champion: Player }
    | { type: "RESET"; matches: Match[] };

function reducer(state: SimulatorState, action: SimAction): SimulatorState {
    switch (action.type) {
        case "START":
            return { ...state, phase: "running", currentRound: 1, champion: null, matches: action.matches };
        case "PAUSE":
            return state.phase === "running" ? { ...state, phase: "paused" } : state;
        case "RESUME":
            return state.phase === "paused" ? { ...state, phase: "running" } : state;
        case "SET_SPEED":
            return { ...state, speed: action.speed };
        case "PATCH_MATCHES":
            return { ...state, matches: action.matches };
        case "ADVANCE_ROUND":
            return { ...state, currentRound: action.round };
        case "FINISH":
            return { ...state, phase: "done", champion: action.champion };
        case "RESET":
            return { ...state, phase: "idle", currentRound: 1, champion: null, matches: action.matches };
        default:
            return state;
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Weighted random winner selection.
 * Players with a higher skill rating win more often, but upsets happen.
 * Skill is derived from the address hash so it's stable per player.
 */
function deriveSkill(player: Player): number {
    let hash = 0;
    for (let i = 0; i < player.address.length; i++) {
        hash = ((hash << 5) - hash) + player.address.charCodeAt(i);
        hash |= 0;
    }
    return 20 + (Math.abs(hash) % 60); // 20–80 range
}

function pickWinner(a: Player, b: Player): Player {
    const skillA = deriveSkill(a);
    const skillB = deriveSkill(b);
    const total = skillA + skillB;
    return Math.random() * total < skillA ? a : b;
}

/**
 * After resolving a match, propagate its winner into the correct slot
 * of the next-round match. Mutates a copy of the array.
 */
function propagate(matches: Match[], resolved: Match): Match[] {
    if (!resolved.winner) return matches;

    const updated = matches.map(m => ({ ...m }));
    const nextRound = resolved.round + 1;
    const nextPos = Math.floor(resolved.position / 2);
    const next = updated.find(m => m.round === nextRound && m.position === nextPos);
    if (!next) return updated;

    const isSlotA = resolved.position % 2 === 0;
    if (isSlotA && !next.playerA) next.playerA = resolved.winner;
    if (!isSlotA && !next.playerB) next.playerB = resolved.winner;

    return updated;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseSimulatorOptions {
    /** Original matches from the tournament view (will be deep-cloned on start) */
    sourceMatches: Match[];
    /** Max round = Math.log2(bracketSize) */
    maxRound: number;
}

export function useSimulator({ sourceMatches, maxRound }: UseSimulatorOptions) {
    const [state, dispatch] = useReducer(reducer, {
        phase: "idle",
        currentRound: 1,
        champion: null,
        speed: "normal",
        matches: sourceMatches.map(m => ({ ...m })),
    });

    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimers = useCallback(() => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    }, []);

    // ── Core simulation engine ────────────────────────────────────────────────

    const simulateRound = useCallback(
        function simulateRound(round: number, currentMatches: Match[], speed: SimSpeed) {
            const { matchMs, roundPauseMs } = SIM_SPEEDS[speed];

            // Collect all matches in this round that have both players
            const toResolve = currentMatches.filter(
                m => m.round === round &&
                    m.playerA !== null &&
                    m.playerB !== null &&
                    m.status !== "completed"
            );

            if (toResolve.length === 0) return;

            // Mark all as in_progress immediately
            let working = currentMatches.map(m =>
                toResolve.some(r => r.id === m.id)
                    ? { ...m, status: "in_progress" as const }
                    : m
            );
            dispatch({ type: "PATCH_MATCHES", matches: working });

            // Stagger individual match resolutions
            toResolve.forEach((match, idx) => {
                const t = setTimeout(() => {
                    // Re-read latest state via ref to avoid stale closure
                    const winner = pickWinner(match.playerA!, match.playerB!);

                    working = working.map(m => {
                        if (m.id !== match.id) return m;
                        return {
                            ...m,
                            winner,
                            status: "completed" as const,
                            result: {
                                scoreA: winner.address === m.playerA?.address ? 1 : 0,
                                scoreB: winner.address === m.playerB?.address ? 1 : 0,
                                txSignature: `demo_${Math.random().toString(36).slice(2, 10)}`,
                                timestamp: new Date().toISOString(),
                            },
                        };
                    });

                    working = propagate(working, { ...match, winner });
                    dispatch({ type: "PATCH_MATCHES", matches: working });

                    // After the last match in this round resolves
                    if (idx === toResolve.length - 1) {
                        if (round >= maxRound) {
                            // Tournament over
                            const t2 = setTimeout(() => {
                                dispatch({ type: "FINISH", champion: winner });
                            }, roundPauseMs * 0.5);
                            timers.current.push(t2);
                        } else {
                            // Advance to next round
                            const t3 = setTimeout(() => {
                                dispatch({ type: "ADVANCE_ROUND", round: round + 1 });
                                simulateRound(round + 1, working, speed);
                            }, roundPauseMs);
                            timers.current.push(t3);
                        }
                    }
                }, idx * matchMs);

                timers.current.push(t);
            });
        },
        [maxRound]
    );

    // ── Public API ────────────────────────────────────────────────────────────

    const start = useCallback(() => {
        // Deep-clone source matches so reset always has a clean slate
        const fresh = sourceMatches.map(m => ({
            ...m,
            winner: null,
            status: "pending" as const,
            result: null,
        }));
        dispatch({ type: "START", matches: fresh });
        simulateRound(1, fresh, state.speed);
    }, [sourceMatches, state.speed, simulateRound]);

    const pause = useCallback(() => {
        clearTimers();
        dispatch({ type: "PAUSE" });
    }, [clearTimers]);

    const resume = useCallback(() => {
        dispatch({ type: "RESUME" });
        simulateRound(state.currentRound, state.matches, state.speed);
    }, [state.currentRound, state.matches, state.speed, simulateRound]);

    const reset = useCallback(() => {
        clearTimers();
        const fresh = sourceMatches.map(m => ({
            ...m,
            winner: null,
            status: "pending" as const,
            result: null,
        }));
        dispatch({ type: "RESET", matches: fresh });
    }, [clearTimers, sourceMatches]);

    const setSpeed = useCallback((speed: SimSpeed) => {
        dispatch({ type: "SET_SPEED", speed });
    }, []);

    // Cleanup on unmount
    useEffect(() => () => clearTimers(), [clearTimers]);

    return { state, start, pause, resume, reset, setSpeed };
}