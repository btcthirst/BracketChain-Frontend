"use client";

import { useState, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import Link from "next/link";
import type { Match, Player } from "@/types/tournament";
import { SOLANA, ROUTES } from "@/constants/links";

// ── Player slot ───────────────────────────────────────────────────────────────

function PlayerSlot({ player, isWinner }: { player: Player | null; isWinner: boolean }) {
    if (!player) {
        return (
            <div className="flex items-center h-8 px-3 text-xs text-gray-400 italic">
                TBD
            </div>
        );
    }
    return (
        <Link 
            href={ROUTES.player(player.address)}
            className={`flex items-center h-8 px-3 text-xs font-mono rounded transition-colors hover:opacity-80 ${isWinner
                ? "bg-blue-600 text-white font-semibold"
                : "text-gray-700 bg-gray-50 hover:bg-gray-100"
            }`}
        >
            {player.display}
        </Link>
    );
}

// ── Hover tooltip ─────────────────────────────────────────────────────────────

function MatchTooltip({ match, organizerHint }: { match: Match; organizerHint: boolean }) {
    const statusLabel = {
        completed: "Completed",
        in_progress: "In Progress",
        pending: "Pending",
    }[match.status];

    return (
        <div className="absolute z-50 bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-52 bg-gray-900 text-white rounded-xl shadow-2xl p-3 pointer-events-none text-xs">
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />

            <div className="flex justify-between mb-2">
                <span className="font-semibold text-gray-300">
                    Round {match.round} — Match {match.position + 1}
                </span>
                <span className={`font-semibold ${match.status === "in_progress"
                    ? "text-blue-400"
                    : match.status === "completed"
                        ? "text-green-400"
                        : "text-gray-400"
                    }`}>
                    {statusLabel}
                </span>
            </div>

            <div className="flex flex-col gap-1 mb-2">
                {[match.playerA, match.playerB].map((p, i) => (
                    <div key={i} className={`flex items-center justify-between px-2 py-1 rounded ${match.winner?.address === p?.address
                        ? "bg-blue-600/30 text-blue-300"
                        : "text-gray-300"
                        }`}>
                        {p ? (
                            <Link href={ROUTES.player(p.address)} className="font-mono hover:underline">{p.display}</Link>
                        ) : (
                            <span className="font-mono text-gray-500">TBD</span>
                        )}
                        {match.result && (
                            <span className="font-bold">
                                {i === 0 ? match.result.scoreA : match.result.scoreB}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {match.result && (
                <div className="border-t border-white/10 pt-2 flex flex-col gap-1">
                    <div className="flex justify-between text-gray-400">
                        <span>Reported</span>
                        <span>{new Date(match.result.timestamp).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })}</span>
                    </div>
                    <a
                        href={SOLANA.explorerTx(match.result.txSignature)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-mono truncate pointer-events-auto"
                    >
                        {match.result.txSignature.slice(0, 12)}…
                        <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                </div>
            )}

            <p className="text-gray-500 mt-2 text-[10px]">
                {organizerHint ? "Click to report winner" : "Click for full details"}
            </p>
        </div>
    );
}

// ── Match node ────────────────────────────────────────────────────────────────

function MatchNode({
    match,
    onClick,
    organizerActionable,
}: {
    match: Match;
    onClick: (m: Match) => void;
    organizerActionable: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const statusRing = {
        completed: "border-green-300 hover:border-green-400",
        in_progress: organizerActionable
            ? "border-purple-400 hover:border-purple-500 shadow-purple-100 shadow-md"
            : "border-blue-400 hover:border-blue-500 shadow-blue-100 shadow-md",
        pending: "border-gray-200 hover:border-gray-300",
    }[match.status];

    const isPulsing = match.status === "in_progress";

    function handleMouseEnter() {
        hoverTimeout.current = setTimeout(() => setHovered(true), 200);
    }

    function handleMouseLeave() {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setHovered(false);
    }

    return (
        <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {hovered && <MatchTooltip match={match} organizerHint={organizerActionable} />}
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
        </div>
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
                            {p ? (
                                <Link href={ROUTES.player(p.address)} className="text-sm font-mono text-gray-700 hover:underline">{p.display}</Link>
                            ) : (
                                <span className="text-sm font-mono text-gray-400 italic">TBD</span>
                            )}
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

export function BracketEmpty({
    onJoin,
    isRegistered = false,
}: {
    onJoin?: () => void;
    isRegistered?: boolean;
}) {
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

            {isRegistered ? (
                <>
                    <p className="text-lg font-semibold text-gray-600">You&apos;re registered!</p>
                    <p className="text-sm text-gray-400 max-w-xs">
                        Waiting for the organizer to start the tournament. The bracket will appear here once it begins.
                    </p>
                </>
            ) : (
                <>
                    <p className="text-lg font-semibold text-gray-500">Waiting for players…</p>
                    <p className="text-sm text-gray-400">The bracket will appear once the tournament starts.</p>
                    {onJoin && (
                        <button
                            onClick={onJoin}
                            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
                        >
                            Be the first to join!
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

// ── Main bracket ──────────────────────────────────────────────────────────────

export function BracketView({
    matches,
    isOrganizer = false,
    onReport,
}: {
    matches: Match[];
    isOrganizer?: boolean;
    onReport?: (m: Match) => void;
}) {
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    const handleMatchClick = (m: Match) => {
        // Organizer + active match → fire report flow; otherwise read-only modal.
        if (isOrganizer && m.status === "in_progress" && onReport) {
            onReport(m);
            return;
        }
        setSelectedMatch(m);
    };

    const rounds = Array.from(new Set(matches.map(m => m.round))).sort();

    return (
        <>
            <div className="overflow-x-auto">
                <div className="flex gap-8 p-6 items-center min-w-max">
                    {rounds.map((round, ri) => {
                        const roundMatches = matches
                            .filter(m => m.round === round)
                            .sort((a, b) => a.position - b.position);

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
                                            onClick={handleMatchClick}
                                            organizerActionable={isOrganizer && match.status === "in_progress"}
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