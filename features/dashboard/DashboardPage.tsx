"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusCircle, RefreshCw, Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ROUTES } from "@/constants/links";
import { useDashboard, type DashboardFilter } from "@/hooks/useDashboard";
import { TournamentTable } from "./TournamentTable";
import { ManageView } from "./ManageView";
import { AnalyticsSection } from "./AnalyticsSection";

// ── Filter tabs ───────────────────────────────────────────────────────────────

const FILTERS: { key: DashboardFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
];

// ── Wallet gate ───────────────────────────────────────────────────────────────

function WalletGate() {
    const { setVisible } = useWalletModal();
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#22d47e]/10 border border-[#22d47e]/20 flex items-center justify-center shadow-[0_0_30px_rgba(34,212,126,0.05)]">
                <Wallet className="w-10 h-10 text-[#22d47e]" />
            </div>
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold text-[#f0f1f5]">Connect your wallet</h2>
                <p className="max-w-xs mx-auto" style={{ color: "rgba(240,241,245,0.42)", fontSize: "0.925rem" }}>
                    Access your personalized tournament dashboard by connecting your Solana wallet.
                </p>
            </div>
            <button
                onClick={() => setVisible(true)}
                className="bg-[#22d47e] hover:bg-[#16c062] text-[#06070b] px-10 py-4 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(34,212,126,0.3)] hover:scale-[1.02] active:scale-[0.98]"
            >
                Connect Wallet
            </button>
        </div>
    );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function TableSkeleton() {
    return (
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            <div className="border-b border-white/10 bg-white/5 px-4 py-3 flex gap-4">
                {["w-20", "w-14", "w-16", "w-24", "w-20", "w-16", "w-16"].map((w, i) => (
                    <div key={i} className={`h-4 ${w} bg-white/10 rounded animate-pulse`} />
                ))}
            </div>
            {[0, 1, 2].map(i => (
                <div key={i} className="flex gap-4 px-4 py-4 border-b border-white/5 last:border-0">
                    {["w-32", "w-12", "w-20", "w-10", "w-20", "w-16", "w-20"].map((w, j) => (
                        <div key={j} className={`h-4 ${w} bg-white/5 rounded animate-pulse`} />
                    ))}
                </div>
            ))}
        </div>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: DashboardFilter }) {
    const isFiltered = filter !== "all";
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <div className="opacity-20">
                <svg viewBox="0 0 120 80" className="w-32 h-20 text-[#22d47e]" fill="none">
                    <rect x="4" y="16" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                    <rect x="4" y="52" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                    <rect x="52" y="34" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                    <rect x="92" y="34" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                    <path d="M28 22 H40 V58 H28" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M40 40 H52" stroke="currentColor" strokeWidth="2" />
                    <path d="M76 40 H92" stroke="currentColor" strokeWidth="2" />
                </svg>
            </div>
            <div className="flex flex-col gap-1">
                <p className="text-xl font-bold text-[#f0f1f5]">
                    {isFiltered ? `No ${filter} tournaments` : "Empty Arena"}
                </p>
                <p className="text-sm max-w-xs mx-auto" style={{ color: "rgba(240,241,245,0.35)" }}>
                    {isFiltered
                        ? "Try switching to another filter tab to find what you're looking for."
                        : "You haven't created any tournaments yet. Ready to start your first one?"
                    }
                </p>
            </div>
            {!isFiltered && (
                <Link
                    href={ROUTES.create}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "10px 22px",
                        background: "#22d47e",
                        color: "#06070b",
                        borderRadius: 8,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        textDecoration: "none",
                        boxShadow: "0 0 18px rgba(34,212,126,0.28)",
                        transition: "background 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#16c062"; e.currentTarget.style.boxShadow = "0 0 28px rgba(34,212,126,0.48)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#22d47e"; e.currentTarget.style.boxShadow = "0 0 18px rgba(34,212,126,0.28)"; }}
                >
                    <PlusCircle style={{ width: 15, height: 15 }} />
                    Create Your First Tournament
                </Link>
            )}
        </div>
    );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-red-500/5 rounded-2xl border border-red-500/20 text-center">
            <RefreshCw className="w-8 h-8 text-red-400 opacity-50" />
            <p className="text-sm text-red-200/60">Failed to synchronize with the blockchain.</p>
            <button
                onClick={onRetry}
                className="flex items-center gap-2 text-sm text-[#22d47e] hover:underline"
            >
                <RefreshCw className="w-4 h-4" /> Retry Connection
            </button>
        </div>
    );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

function DashboardContent() {
    const { publicKey } = useWallet();
    const [filter, setFilter] = useState<DashboardFilter>("all");
    const [managingId, setManagingId] = useState<string | null>(null);

    const { state, refresh } = useDashboard(filter);

    const { state: allState } = useDashboard("all");
    const allTournaments = allState.status === "success" ? allState.data : [];

    const walletDisplay = publicKey
        ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
        : "";

    if (managingId) {
        return (
            <div className="container mx-auto px-6 py-8 max-w-6xl">
                <ManageView
                    tournamentId={managingId}
                    onBack={() => { setManagingId(null); refresh(); }}
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-8 max-w-6xl flex flex-col gap-8">

            {/* Top bar */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold text-[#f0f1f5] tracking-tight">Dashboard</h1>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#22d47e] shadow-[0_0_8px_#22d47e]" />
                        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "rgba(240,241,245,0.3)" }}>{walletDisplay}</span>
                    </div>
                </div>
                <Link
                    href={ROUTES.create}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "10px 22px",
                        background: "#22d47e",
                        color: "#06070b",
                        borderRadius: 8,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        textDecoration: "none",
                        boxShadow: "0 0 18px rgba(34,212,126,0.28)",
                        transition: "background 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#16c062"; e.currentTarget.style.boxShadow = "0 0 28px rgba(34,212,126,0.48)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#22d47e"; e.currentTarget.style.boxShadow = "0 0 18px rgba(34,212,126,0.28)"; }}
                >
                    <PlusCircle style={{ width: 15, height: 15 }} />
                    Create Tournament
                </Link>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-1.5 w-fit">
                {FILTERS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === f.key
                            ? "bg-white/10 text-[#22d47e] shadow-inner"
                            : "text-gray-500 hover:text-gray-300"
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Tournament list */}
            <div className="relative">
                {state.status === "loading" || state.status === "idle"
                    ? <TableSkeleton />
                    : state.status === "error"
                        ? <ErrorState onRetry={refresh} />
                        : state.status === "empty"
                            ? <EmptyState filter={filter} />
                            : (
                                <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
                                    <TournamentTable
                                        tournaments={state.data}
                                        onManage={id => setManagingId(id)}
                                    />
                                </div>
                            )
                }
            </div>

            {/* Analytics */}
            {allTournaments.length > 0 && (
                <div className="mt-4">
                    <AnalyticsSection tournaments={allTournaments} />
                </div>
            )}
        </div>
    );
}

// ── Page wrapper with Navbar / wallet gate ────────────────────────────────────

export function DashboardPage() {
    const { connected } = useWallet();

    return (
        <div className="min-h-screen bg-transparent flex flex-col font-sans selection:bg-[#22d47e]/30">
            <Navbar />
            <main className="flex-1 relative z-10">
                {connected ? <DashboardContent /> : <WalletGate />}
            </main>
            <Footer />
        </div>
    );
}