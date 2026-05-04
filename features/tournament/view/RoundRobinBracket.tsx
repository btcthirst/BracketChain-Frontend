"use client";

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import type { Match, Player } from "@/types/tournament";
import { SOLANA } from "@/constants/links";

// ── Match detail modal ────────────────────────────────────────────────────────

function MatchModal({ match, onClose }: { match: Match; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-5 p-6">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">
                        {match.playerA?.display ?? "TBD"} vs {match.playerB?.display ?? "TBD"}
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

// ── Result cell ───────────────────────────────────────────────────────────────

type CellResult = "W" | "L" | "D" | null;

function ResultCell({
    result,
    status,
    onClick,
}: {
    result: CellResult;
    status: Match["status"] | "self" | "empty";
    onClick?: () => void;
}) {
    if (status === "self") {
        return (
            <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded">
                <div className="w-4 h-px bg-gray-300" />
            </div>
        );
    }

    if (status === "empty" || result === null) {
        return (
            <div className="w-10 h-10 flex items-center justify-center text-xs text-gray-300 rounded border border-dashed border-gray-200">
                —
            </div>
        );
    }

    const config = {
        W: { label: "W", cls: "bg-blue-600 text-white font-bold" },
        L: { label: "L", cls: "bg-red-50  text-red-500  font-semibold" },
        D: { label: "D", cls: "bg-gray-100 text-gray-500 font-semibold" },
    }[result];

    const isPulsing = status === "in_progress";

    return (
        <button
            onClick={onClick}
            className={`w-10 h-10 flex items-center justify-center text-xs rounded transition-all hover:opacity-80 hover:scale-105 ${config.cls} ${isPulsing ? "animate-pulse" : ""}`}
        >
            {config.label}
        </button>
    );
}

// ── Build matrix from matches ─────────────────────────────────────────────────

interface PlayerRecord {
    player: Player;
    wins: number;
    losses: number;
    draws: number;
    points: number;
}

function buildMatrix(matches: Match[]): {
    players: Player[];
    records: PlayerRecord[];
    // matrix[rowIdx][colIdx] = match or null
    matrix: (Match | null)[][];
} {
    // Collect unique players preserving order
    const playerMap = new Map<string, Player>();
    for (const m of matches) {
        if (m.playerA) playerMap.set(m.playerA.address, m.playerA);
        if (m.playerB) playerMap.set(m.playerB.address, m.playerB);
    }
    const players = Array.from(playerMap.values());

    // Build n×n matrix (indexed by player order)
    const n = players.length;
    const matrix: (Match | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));

    for (const m of matches) {
        if (!m.playerA || !m.playerB) continue;
        const rowIdx = players.findIndex(p => p.address === m.playerA!.address);
        const colIdx = players.findIndex(p => p.address === m.playerB!.address);
        if (rowIdx === -1 || colIdx === -1) continue;
        matrix[rowIdx][colIdx] = m;
        matrix[colIdx][rowIdx] = m; // symmetric
    }

    // Compute standings
    const records: PlayerRecord[] = players.map(player => {
        let wins = 0, losses = 0, draws = 0;
        for (const m of matches) {
            if (!m.winner && m.status !== "completed") continue;
            const isA = m.playerA?.address === player.address;
            const isB = m.playerB?.address === player.address;
            if (!isA && !isB) continue;
            if (!m.winner) { draws++; continue; }
            if (m.winner.address === player.address) wins++;
            else losses++;
        }
        return { player, wins, losses, draws, points: wins * 3 + draws };
    });

    // Sort by points desc, then wins desc
    records.sort((a, b) => b.points - a.points || b.wins - a.wins);

    // Reorder players to match standings
    const sortedPlayers = records.map(r => r.player);
    const sortedMatrix: (Match | null)[][] = sortedPlayers.map(rowPlayer => {
        const rowIdx = players.findIndex(p => p.address === rowPlayer.address);
        return sortedPlayers.map(colPlayer => {
            const colIdx = players.findIndex(p => p.address === colPlayer.address);
            return matrix[rowIdx][colIdx];
        });
    });

    return { players: sortedPlayers, records, matrix: sortedMatrix };
}

function getCellResult(match: Match, rowPlayer: Player): CellResult {
    if (match.status !== "completed") return null;
    if (!match.winner) return "D";
    return match.winner.address === rowPlayer.address ? "W" : "L";
}

// ── Main component ────────────────────────────────────────────────────────────

export function RoundRobinBracket({ matches }: { matches: Match[] }) {
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    if (matches.length === 0) {
        return (
            <div className="py-12 text-center text-sm text-gray-400 p-6">
                Pairings will appear once the tournament starts.
            </div>
        );
    }

    const { players, records, matrix } = buildMatrix(matches);

    return (
        <>
            <div className="overflow-x-auto p-6 flex flex-col gap-6">

                {/* Results matrix */}
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Results Matrix</p>
                    <div className="overflow-x-auto">
                        <table className="border-collapse">
                            <thead>
                                <tr>
                                    {/* Empty corner */}
                                    <th className="w-28 min-w-[7rem]" />
                                    {players.map((p, ci) => (
                                        <th key={ci} className="w-10 pb-2">
                                            <span
                                                className="block text-[10px] font-mono text-gray-500 truncate max-w-[40px] text-center"
                                                title={p.address}
                                            >
                                                {p.display.split("…")[0]}
                                            </span>
                                        </th>
                                    ))}
                                    <th className="w-12 pb-2 text-[10px] font-semibold text-gray-400 text-right pr-1">Pts</th>
                                    <th className="w-20 pb-2 text-[10px] font-semibold text-gray-400 text-right pr-1">W/D/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.map((rowPlayer, ri) => {
                                    const record = records.find(r => r.player.address === rowPlayer.address)!;
                                    return (
                                        <tr key={ri}>
                                            {/* Row player label */}
                                            <td className="pr-3 py-1">
                                                <span className="text-xs font-mono text-gray-700 truncate block max-w-[6.5rem]" title={rowPlayer.address}>
                                                    {rowPlayer.display}
                                                </span>
                                            </td>
                                            {/* Result cells */}
                                            {matrix[ri].map((match, ci) => {
                                                if (ri === ci) {
                                                    return (
                                                        <td key={ci} className="p-0.5">
                                                            <ResultCell result={null} status="self" />
                                                        </td>
                                                    );
                                                }
                                                if (!match) {
                                                    return (
                                                        <td key={ci} className="p-0.5">
                                                            <ResultCell result={null} status="empty" />
                                                        </td>
                                                    );
                                                }
                                                const result = getCellResult(match, rowPlayer);
                                                return (
                                                    <td key={ci} className="p-0.5">
                                                        <ResultCell
                                                            result={result}
                                                            status={match.status}
                                                            onClick={() => setSelectedMatch(match)}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            {/* Points */}
                                            <td className="pl-3 text-right text-xs font-bold text-gray-800">{record.points}</td>
                                            {/* W/D/L */}
                                            <td className="pl-2 text-right text-xs text-gray-400 whitespace-nowrap">
                                                {record.wins}/{record.draws}/{record.losses}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Standings table */}
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Standings</p>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Player</th>
                                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 w-10">W</th>
                                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 w-10">D</th>
                                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 w-10">L</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 w-14">Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((rec, rank) => (
                                    <tr key={rec.player.address} className="border-b border-gray-100 last:border-0">
                                        <td className="px-4 py-3 text-xs text-gray-400">{rank + 1}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-mono ${rank === 0 ? "text-blue-700 font-semibold" : "text-gray-700"}`}>
                                                {rec.player.display}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-gray-700">{rec.wins}</td>
                                        <td className="px-4 py-3 text-center text-xs text-gray-500">{rec.draws}</td>
                                        <td className="px-4 py-3 text-center text-xs text-gray-400">{rec.losses}</td>
                                        <td className="px-4 py-3 text-right text-xs font-bold text-gray-900">{rec.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedMatch && (
                <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
            )}
        </>
    );
}