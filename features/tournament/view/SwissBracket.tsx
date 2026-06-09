"use client";

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import type { Match, Player } from "@/types/tournament";
import { SOLANA } from "@/constants/links";

// ── Match detail modal (reused from BracketView) ──────────────────────────────

function MatchModal({ match, onClose }: { match: Match; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-5 p-6">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">
                        Round {match.round} — Match {match.position + 1}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    {[match.playerA, match.playerB].map((p, i) => (
                        <div
                            key={i}
                            className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${match.winner?.address === p?.address
                                    ? "border-blue-300 bg-blue-50"
                                    : "border-gray-200 bg-gray-50"
                                }`}
                        >
                            <span className="text-sm font-mono text-gray-700">{p?.display ?? "TBD"}</span>
                            {match.result && (
                                <span className="text-sm font-bold text-gray-900">
                                    {i === 0 ? match.result.scoreA : match.result.scoreB}
                                </span>
                            )}
                            {match.winner?.address === p?.address && (
                                <span className="text-xs font-semibold text-blue-600 ml-2">Winner</span>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                    <div className="flex justify-between">
                        <span>Status</span>
                        <span className="capitalize font-medium text-gray-700">
                            {match.status.replace("_", " ")}
                        </span>
                    </div>
                    {match.result && (
                        <>
                            <div className="flex justify-between">
                                <span>Reported</span>
                                <span className="font-medium text-gray-700">
                                    {new Date(match.result.timestamp).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Transaction</span>
                                <a
                                    href={SOLANA.explorerTx(match.result.txSignature)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 font-mono text-blue-600 hover:underline truncate max-w-[140px]"
                                >
                                    {match.result.txSignature.slice(0, 8)}…
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                            </div>
                        </>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: Match["status"] }) {
    const config = {
        completed: { label: "Done", cls: "bg-green-100 text-green-700" },
        in_progress: { label: "Live", cls: "bg-blue-100  text-blue-700  animate-pulse" },
        pending_confirmation: { label: "Confirm", cls: "bg-amber-100 text-amber-700" },
        disputed: { label: "Disputed", cls: "bg-red-100   text-red-700" },
        pending: { label: "Pending", cls: "bg-gray-100  text-gray-500" },
    }[status];
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.cls}`}>
            {config.label}
        </span>
    );
}

// ── Player cell ───────────────────────────────────────────────────────────────

function PlayerCell({
    player,
    isWinner,
    score,
}: {
    player: Player | null;
    isWinner: boolean;
    score?: number;
}) {
    if (!player) {
        return <span className="text-xs text-gray-400 italic">TBD</span>;
    }
    return (
        <span className={`flex items-center gap-2 text-xs font-mono ${isWinner ? "font-semibold text-blue-700" : "text-gray-700"}`}>
            {isWinner && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
            {player.display}
            {score !== undefined && (
                <span className={`ml-auto font-bold ${isWinner ? "text-blue-700" : "text-gray-500"}`}>
                    {score}
                </span>
            )}
        </span>
    );
}

// ── Swiss bracket (round-by-round table) ──────────────────────────────────────

export function SwissBracket({ matches }: { matches: Match[] }) {
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);

    return (
        <>
            <div className="overflow-x-auto">
                <div className="flex flex-col gap-6 p-6">
                    {rounds.map(round => {
                        const roundMatches = matches
                            .filter(m => m.round === round)
                            .sort((a, b) => a.position - b.position);

                        return (
                            <div key={round} className="flex flex-col gap-2">
                                {/* Round header */}
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Round {round}
                                    </span>
                                    <div className="flex-1 h-px bg-gray-100" />
                                    <span className="text-xs text-gray-400">
                                        {roundMatches.filter(m => m.status === "completed").length}/{roundMatches.length} completed
                                    </span>
                                </div>

                                {/* Pairings table */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Player A</th>
                                                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 w-12">vs</th>
                                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Player B</th>
                                                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 w-20">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {roundMatches.map((match, idx) => (
                                                <tr
                                                    key={match.id}
                                                    onClick={() => setSelectedMatch(match)}
                                                    className={`border-b border-gray-100 last:border-0 cursor-pointer transition-colors hover:bg-gray-50 ${match.status === "in_progress" ? "bg-blue-50/40" : ""
                                                        }`}
                                                >
                                                    <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <PlayerCell
                                                            player={match.playerA}
                                                            isWinner={match.winner?.address === match.playerA?.address}
                                                            score={match.result?.scoreA}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-xs text-gray-400 font-medium">—</td>
                                                    <td className="px-4 py-3">
                                                        <PlayerCell
                                                            player={match.playerB}
                                                            isWinner={match.winner?.address === match.playerB?.address}
                                                            score={match.result?.scoreB}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <StatusPill status={match.status} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}

                    {rounds.length === 0 && (
                        <div className="py-12 text-center text-sm text-gray-400">
                            Pairings will appear once the tournament starts.
                        </div>
                    )}
                </div>
            </div>

            {selectedMatch && (
                <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
            )}
        </>
    );
}