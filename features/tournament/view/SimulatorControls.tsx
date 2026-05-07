"use client";

/**
 * SimulatorControls.tsx
 *
 * HUD banner shown inside TournamentPage when format === "SE-demo".
 * Renders:
 *   - Phase indicator (idle / running / paused / done)
 *   - Round progress pills
 *   - Speed selector
 *   - Start / Pause / Resume / Reset buttons
 *   - Champion reveal card when done
 *
 * Wired up by TournamentPage.tsx — receives state + callbacks from useSimulator.
 */

import { Play, Pause, RotateCcw, ChevronRight, Trophy, Zap } from "lucide-react";
import type { SimulatorState, SimSpeed } from "@/hooks/useSimulator";
import { SIM_SPEEDS } from "@/hooks/useSimulator";
import type { Match } from "@/types/tournament";

// ── Round label helper ────────────────────────────────────────────────────────

function roundLabel(r: number, maxRound: number): string {
    if (r === maxRound) return "Final";
    if (r === maxRound - 1 && maxRound >= 3) return "Semis";
    if (r === maxRound - 2 && maxRound >= 4) return "Quarters";
    return `Round ${r}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SimulatorControlsProps {
    simState: SimulatorState;
    matches: Match[];
    maxRound: number;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onReset: () => void;
    onSetSpeed: (s: SimSpeed) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SimulatorControls({
    simState,
    matches,
    maxRound,
    onStart,
    onPause,
    onResume,
    onReset,
    onSetSpeed,
}: SimulatorControlsProps) {
    const { phase, currentRound, champion, speed } = simState;

    const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);

    const isRoundDone = (r: number) =>
        matches
            .filter(m => m.round === r)
            .every(m => m.status === "completed" || (!m.playerA && !m.playerB));

    // ── Champion banner ───────────────────────────────────────────────────────
    if (phase === "done" && champion) {
        return (
            <div className="flex flex-col items-center gap-4 py-8 px-6 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-200">
                    <Trophy className="w-8 h-8 text-green-600" />
                </div>
                <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-green-600 mb-1">
                        Tournament Champion
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{champion.display}</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                        {champion.address.slice(0, 4)}…{champion.address.slice(-4)}
                    </p>
                </div>
                <button
                    onClick={onReset}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-5 py-2 rounded-lg transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                    Simulate Again
                </button>
            </div>
        );
    }

    // ── Main HUD ──────────────────────────────────────────────────────────────
    return (
        <div className="border-b border-gray-100 bg-gray-50">
            {/* Top row: label + speed + controls */}
            <div className="flex items-center justify-between gap-3 px-5 py-2.5 flex-wrap">
                {/* Left: mode badge */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1">
                        <Zap className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-semibold text-blue-700">SE-demo</span>
                        {phase === "running" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        )}
                        {phase === "paused" && (
                            <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1 rounded">
                                PAUSED
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-gray-400">Auto-simulation mode</span>
                </div>

                {/* Right: speed + action buttons */}
                <div className="flex items-center gap-2">
                    {/* Speed selector — pill group matching Dashboard filter style */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-0.5">
                        {(Object.keys(SIM_SPEEDS) as SimSpeed[]).map(s => (
                            <button
                                key={s}
                                onClick={() => onSetSpeed(s)}
                                className={[
                                    "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all",
                                    speed === s
                                        ? "bg-gray-900 text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-700",
                                ].join(" ")}
                            >
                                {SIM_SPEEDS[s].label}
                            </button>
                        ))}
                    </div>

                    {/* Start */}
                    {phase === "idle" && (
                        <button
                            onClick={onStart}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                            <Play className="w-3.5 h-3.5" />
                            Start Simulation
                        </button>
                    )}

                    {/* Pause */}
                    {phase === "running" && (
                        <button
                            onClick={onPause}
                            className="flex items-center gap-1.5 border border-gray-300 hover:border-gray-400 bg-white text-gray-700 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                            <Pause className="w-3.5 h-3.5" />
                            Pause
                        </button>
                    )}

                    {/* Resume */}
                    {phase === "paused" && (
                        <button
                            onClick={onResume}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                            <Play className="w-3.5 h-3.5" />
                            Resume
                        </button>
                    )}

                    {/* Reset — shown when not idle */}
                    {phase !== "idle" && (
                        <button
                            onClick={onReset}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white border border-gray-200 transition-colors"
                            title="Reset simulation"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Round progress pills — only while active */}
            {phase !== "idle" && (
                <div className="flex items-center gap-2 px-5 pb-2.5 overflow-x-auto">
                    {rounds.map((r, i) => {
                        const done = isRoundDone(r);
                        const active = currentRound === r;
                        return (
                            <div key={r} className="flex items-center gap-2 flex-shrink-0">
                                <span
                                    className={[
                                        "px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all duration-300",
                                        active && !done
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : done
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : "bg-white text-gray-400 border-gray-200",
                                    ].join(" ")}
                                >
                                    {done ? "✓ " : ""}
                                    {roundLabel(r, maxRound)}
                                </span>
                                {i < rounds.length - 1 && (
                                    <ChevronRight className="w-3 h-3 text-gray-300" />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Idle hint */}
            {phase === "idle" && (
                <p className="px-5 pb-3 text-[11px] text-gray-400">
                    Press &quot;Start Simulation&quot; — winners are picked probabilistically. Higher skill wins more often, but upsets happen.
                </p>
            )}
        </div>
    );
}