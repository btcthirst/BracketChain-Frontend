"use client";

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import type { Match, Player } from "@/types/tournament";
import { SOLANA } from "@/constants/links";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// ── Match node ────────────────────────────────────────────────────────────────

function PlayerSlot({ player, isWinner }: { player: Player | null; isWinner: boolean }) {
    if (!player) {
        return (
            <div className="flex items-center h-8 px-3 text-xs text-gray-400 italic">
                TBD
            </div>
        );
    }
    return (
        <div className={`flex items-center h-8 px-3 text-xs font-mono rounded transition-colors ${isWinner
            ? "bg-blue-600 text-white font-semibold"
            : "text-gray-700"
            }`}>
            {player.display}
        </div>
    );
}

function MatchNode({
    match,
    onClick,
}: {
    match: Match;
    onClick: (m: Match) => void;
}) {
    const statusRing = {
        completed: "border-green-300 hover:border-green-400",
        in_progress: "border-blue-400  hover:border-blue-500 shadow-blue-100 shadow-md",
        pending: "border-gray-200  hover:border-gray-300",
    }[match.status];

    const isPulsing = match.status === "in_progress";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={() => onClick(match)}
                    className={`relative w-44 border-2 rounded-lg overflow-hidden bg-white transition-all ${statusRing} ${isPulsing ? "animate-pulse-border" : ""}`}
                >
                    {isPulsing && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    )}
                    <div className="divide-y divide-gray-100">
                        <PlayerSlot player={match.playerA} isWinner={match.winner?.address === match.playerA?.address} />
                        <PlayerSlot player={match.playerB} isWinner={match.winner?.address === match.playerB?.address} />
                    </div>
                </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-3 min-w-48 bg-white border border-gray-200 shadow-xl text-gray-900">
                <div className="flex flex-col gap-2">
                    <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        Round {match.round} • Match {match.position + 1}
                    </div>
                    <div className="flex flex-col gap-1">
                        {[match.playerA, match.playerB].map((p, i) => (
                            <div key={i} className="flex items-center justify-between gap-4">
                                <span className={`text-xs font-mono ${match.winner?.address === p?.address ? "text-blue-600 font-bold" : "text-gray-600"}`}>
                                    {p?.display ?? "TBD"}
                                </span>
                                {match.result && (
                                    <span className="text-xs font-bold">
                                        {i === 0 ? match.result.scoreA : match.result.scoreB}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-1 pt-1 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 uppercase">Status</span>
                        <span className={`text-[10px] font-bold uppercase ${match.status === "in_progress" ? "text-blue-500" :
                            match.status === "completed" ? "text-green-500" : "text-gray-400"
                            }`}>
                            {match.status.replace("_", " ")}
                        </span>
                    </div>
                </div>
            </TooltipContent>
        </Tooltip>
    );
}

// ── Match detail modal ────────────────────────────────────────────────────────

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
                        <div key={i} className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${match.winner?.address === p?.address
                            ? "border-blue-300 bg-blue-50"
                            : "border-gray-200 bg-gray-50"
                            }`}>
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
                        <span className="capitalize font-medium text-gray-700">{match.status.replace("_", " ")}</span>
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
                                    className="flex items-center gap-1 font-mono text-blue-600 hover:underline"
                                >
                                    {match.result.txSignature}
                                    <ExternalLink className="w-3 h-3" />
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

// ── Bracket skeleton ──────────────────────────────────────────────────────────

export function BracketSkeleton() {
    return (
        <div className="flex gap-12 p-6 overflow-x-auto">
            {[4, 2, 1].map((count, ri) => (
                <div key={ri} className="flex flex-col gap-6 justify-around" style={{ minWidth: 176 }}>
                    {Array.from({ length: count }).map((_, i) => (
                        <div key={i} className="w-44 border-2 border-gray-200 rounded-lg overflow-hidden animate-pulse">
                            <div className="h-8 bg-gray-100 border-b border-gray-200" />
                            <div className="h-8 bg-gray-50" />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// ── Empty bracket ─────────────────────────────────────────────────────────────

export function BracketEmpty({ onJoin }: { onJoin?: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <svg viewBox="0 0 200 120" className="w-48 h-28 text-gray-200" fill="none">
                <rect x="8" y="20" width="44" height="18" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" />
                <rect x="8" y="54" width="44" height="18" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" />
                <rect x="8" y="82" width="44" height="18" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" />
                <rect x="8" y="116" width="44" height="18" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" />
                <path d="M52 29 H76 V63 H52" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" fill="none" />
                <path d="M52 91 H76 V125 H52" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" fill="none" />
                <rect x="76" y="37" width="44" height="18" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" />
                <rect x="76" y="99" width="44" height="18" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" />
                <path d="M120 46 H148 V108 H120" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" fill="none" />
                <rect x="148" y="62" width="44" height="18" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" />
            </svg>
            <p className="text-lg font-semibold text-gray-500">Waiting for players…</p>
            <p className="text-sm text-gray-400">The bracket will appear once players register.</p>
            {onJoin && (
                <button
                    onClick={onJoin}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
                >
                    Be the first to join!
                </button>
            )}
        </div>
    );
}

// ── Main bracket ──────────────────────────────────────────────────────────────

export function BracketView({ matches }: { matches: Match[] }) {
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    const rounds = Array.from(new Set(matches.map(m => m.round))).sort();

    return (
        <>
            <div className="overflow-x-auto">
                <div className="flex gap-8 p-6 items-center min-w-max">
                    {rounds.map((round, ri) => {
                        const roundMatches = matches
                            .filter(m => m.round === round)
                            .sort((a, b) => a.position - b.position);

                        // Vertical spacing grows per round
                        const gap = `${(ri + 1) * 16}px`;

                        return (
                            <div key={round} className="flex flex-col items-center gap-2">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    {round === Math.max(...rounds) ? "Final" : `Round ${round}`}
                                </span>
                                <div className="flex flex-col" style={{ gap }}>
                                    {roundMatches.map(match => (
                                        <MatchNode
                                            key={match.id}
                                            match={match}
                                            onClick={setSelectedMatch}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedMatch && (
                <MatchModal
                    match={selectedMatch}
                    onClose={() => setSelectedMatch(null)}
                />
            )}
        </>
    );
}