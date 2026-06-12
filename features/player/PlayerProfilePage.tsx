"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Settings, Trophy } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Identicon } from "@/components/ui/Identicon";
import { CopyButton } from "@/components/ui/CopyButton";
import { ROUTES, SOLANA } from "@/constants/links";
import { shortenAddress } from "@/lib/format";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { PLAYER_PROFILE_IS_MOCK } from "@/lib/playerSource";
import type {
    IndexerBracketFormat,
    IndexerGame,
    IndexerPlayerHistoryRow,
} from "@/lib/indexerClient";

const GAME_LABELS: Record<IndexerGame, string> = {
    Manual: "Manual",
    Dota2: "Dota 2",
    Cs2Faceit: "CS2",
    Valorant: "Valorant",
    LoL: "League of Legends",
};

const FORMAT_LABELS: Record<IndexerBracketFormat, string> = {
    SingleElimination: "Single Elim",
    DoubleElimination: "Double Elim",
    Swiss: "Swiss",
    RoundRobin: "Round Robin",
};

function formatUsdMicro(micro: string): string {
    const usd = Number(BigInt(micro)) / 1_000_000;
    return `$${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function ordinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

type SortKey = "date" | "prize" | "placement";

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 flex flex-col gap-1">
            <span style={{ fontSize: "0.7rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(240,241,245,0.4)" }}>
                {label}
            </span>
            <span style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f0f1f5" }}>{value}</span>
        </div>
    );
}

export function PlayerProfilePage({ wallet }: { wallet: string }) {
    const { state } = usePlayerProfile(wallet);
    const { address: myAddress } = useActiveWallet();
    const isOwn = !!myAddress && myAddress === wallet;

    const [sortKey, setSortKey] = useState<SortKey>("date");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const sorted = useMemo(() => {
        const rows = state.status === "success" ? [...state.data.history] : [];
        rows.sort((a, b) => {
            let cmp = 0;
            if (sortKey === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
            else if (sortKey === "prize") cmp = Number(BigInt(a.prizeMicro) - BigInt(b.prizeMicro));
            else cmp = (a.placement ?? 999) - (b.placement ?? 999);
            return sortDir === "asc" ? cmp : -cmp;
        });
        return rows;
    }, [state, sortKey, sortDir]);

    function toggleSort(key: SortKey) {
        if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
            setSortKey(key);
            setSortDir(key === "placement" ? "asc" : "desc");
        }
    }

    return (
        <div className="min-h-screen bg-transparent flex flex-col font-sans selection:bg-[#22d47e]/30">
            <Navbar />
            <main className="flex-1 relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10">
                {/* Header */}
                <div className="flex items-center gap-4 flex-wrap">
                    <Identicon address={wallet} size={64} />
                    <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f0f1f5" }}>
                                {shortenAddress(wallet, 6, 6)}
                            </h1>
                            <CopyButton
                                value={wallet}
                                title="Copy address"
                                style={{ color: "rgba(240,241,245,0.5)", fontSize: "0.75rem" }}
                            />
                            <a
                                href={SOLANA.explorerAddr(wallet)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "rgba(240,241,245,0.5)" }}
                                title="View on Solana Explorer"
                            >
                                <ExternalLink size={13} />
                            </a>
                        </div>
                        {PLAYER_PROFILE_IS_MOCK && (
                            <span style={{ fontSize: "0.7rem", color: "#f5a623" }}>
                                demo data — live stats pending indexer support
                            </span>
                        )}
                    </div>
                    {isOwn && (
                        <Link
                            href={ROUTES.account}
                            className="ml-auto inline-flex items-center gap-2 rounded-lg px-4 py-2"
                            style={{ background: "rgba(34,212,126,0.10)", border: "1px solid rgba(34,212,126,0.30)", color: "#86efac", fontSize: "0.85rem" }}
                        >
                            <Settings size={14} /> My Account
                        </Link>
                    )}
                </div>

                {/* Stats */}
                {state.status === "success" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-8">
                        <StatCard label="Played" value={String(state.data.stats.played)} />
                        <StatCard label="Wins" value={String(state.data.stats.wins)} />
                        <StatCard label="Losses" value={String(state.data.stats.losses)} />
                        <StatCard label="Win Rate" value={`${Math.round(state.data.stats.winRate * 100)}%`} />
                        <StatCard label="Total Earned" value={formatUsdMicro(state.data.stats.totalEarnedMicro)} />
                    </div>
                )}

                {/* History */}
                <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#f0f1f5", margin: "2.5rem 0 1rem" }}>
                    Tournament History
                </h2>

                {state.status === "loading" && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center" style={{ color: "rgba(240,241,245,0.4)" }}>
                        Loading…
                    </div>
                )}

                {state.status === "error" && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center" style={{ color: "rgba(240,241,245,0.5)" }}>
                        No activity found for this address.
                    </div>
                )}

                {state.status === "success" && sorted.length === 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center" style={{ color: "rgba(240,241,245,0.5)" }}>
                        This player hasn’t competed in any BracketChain tournaments yet.
                    </div>
                )}

                {state.status === "success" && sorted.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="hidden sm:grid px-5 py-3 border-b border-white/10 text-xs" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", color: "rgba(240,241,245,0.4)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                            <span>Tournament</span>
                            <button type="button" onClick={() => toggleSort("date")} className="text-left cursor-pointer hover:text-white">Date</button>
                            <span>Format</span>
                            <button type="button" onClick={() => toggleSort("placement")} className="text-left cursor-pointer hover:text-white">Placement</button>
                            <button type="button" onClick={() => toggleSort("prize")} className="text-left cursor-pointer hover:text-white">Prize</button>
                        </div>
                        {sorted.map((row, i) => (
                            <HistoryRow key={`${row.tournamentAddress}-${i}`} row={row} />
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}

function HistoryRow({ row }: { row: IndexerPlayerHistoryRow }) {
    const isChampion = row.placement === 1;
    return (
        <div
            className="px-5 py-4 border-b border-white/5 last:border-0 grid grid-cols-2 sm:grid-cols-5 gap-2 items-center"
            style={{ gridTemplateColumns: undefined }}
        >
            <Link
                href={ROUTES.tournament(row.tournamentAddress)}
                className="font-medium hover:underline col-span-2 sm:col-span-1"
                style={{ color: "#f0f1f5", fontSize: "0.9rem" }}
            >
                {row.name}
                <span style={{ display: "block", fontSize: "0.72rem", color: "rgba(240,241,245,0.4)" }}>
                    {row.game ? GAME_LABELS[row.game] : "—"}
                </span>
            </Link>
            <span style={{ fontSize: "0.82rem", color: "rgba(240,241,245,0.6)" }}>{formatDate(row.date)}</span>
            <span style={{ fontSize: "0.82rem", color: "rgba(240,241,245,0.6)" }}>{FORMAT_LABELS[row.format]}</span>
            <span style={{ fontSize: "0.85rem", color: isChampion ? "#22d47e" : "rgba(240,241,245,0.8)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                {isChampion && <Trophy size={13} />}
                {row.placement != null ? ordinal(row.placement) : "—"}
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: row.prizeMicro !== "0" ? "#22d47e" : "rgba(240,241,245,0.35)" }}>
                {formatUsdMicro(row.prizeMicro)}
            </span>
        </div>
    );
}
