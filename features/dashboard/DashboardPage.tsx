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
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-blue-500" />
            </div>
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-gray-900">Connect your wallet</h2>
                <p className="text-gray-500 max-w-xs">
                    Your dashboard is wallet-gated. Connect to view and manage your tournaments.
                </p>
            </div>
            <button
                onClick={() => setVisible(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
                Connect Wallet
            </button>
        </div>
    );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function TableSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex gap-4">
                {["w-20", "w-14", "w-16", "w-24", "w-20", "w-16", "w-16"].map((w, i) => (
                    <div key={i} className={`h-4 ${w} bg-gray-200 rounded animate-pulse`} />
                ))}
            </div>
            {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 px-4 py-4 border-b border-gray-100 last:border-0">
                    {["w-32", "w-12", "w-20", "w-10", "w-20", "w-16", "w-20"].map((w, j) => (
                        <div key={j} className={`h-4 ${w} bg-gray-100 rounded animate-pulse`} />
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
        <div className="flex flex-col items-center justify-center py-20 gap-5 text-center bg-white rounded-2xl border border-gray-200">
            <svg viewBox="0 0 120 80" className="w-32 h-20 text-gray-200" fill="none">
                <rect x="4" y="16" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                <rect x="4" y="52" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                <rect x="52" y="34" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                <rect x="92" y="34" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                <path d="M28 22 H40 V58 H28" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M40 40 H52" stroke="currentColor" strokeWidth="2" />
                <path d="M76 40 H92" stroke="currentColor" strokeWidth="2" />
            </svg>
            <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold text-gray-700">
                    {isFiltered ? `No ${filter} tournaments` : "You haven't created any tournaments yet."}
                </p>
                <p className="text-sm text-gray-400 max-w-xs">
                    {isFiltered
                        ? "Try a different filter tab."
                        : "Create your first tournament and start competing on-chain."
                    }
                </p>
            </div>
            {!isFiltered && (
                <Link
                    href={ROUTES.create}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                    <PlusCircle className="w-4 h-4" />
                    Create Your First Tournament
                </Link>
            )}
        </div>
    );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-white rounded-2xl border border-gray-200 text-center">
            <RefreshCw className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">Failed to load your tournaments.</p>
            <button
                onClick={onRetry}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
                <RefreshCw className="w-4 h-4" /> Try again
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

    // Derived: all tournaments (for analytics) — always use "all" filter data
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
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <span className="text-xs font-mono text-gray-400">{walletDisplay}</span>
                </div>
                <Link
                    href={ROUTES.create}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
                >
                    <PlusCircle className="w-4 h-4" />
                    Create Tournament
                </Link>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {FILTERS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f.key
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Tournament list */}
            {state.status === "loading" || state.status === "idle"
                ? <TableSkeleton />
                : state.status === "error"
                    ? <ErrorState onRetry={refresh} />
                    : state.status === "empty"
                        ? <EmptyState filter={filter} />
                        : (
                            <TournamentTable
                                tournaments={state.data}
                                onManage={id => setManagingId(id)}
                            />
                        )
            }

            {/* Analytics */}
            {allTournaments.length > 0 && (
                <AnalyticsSection tournaments={allTournaments} />
            )}
        </div>
    );
}

// ── Page wrapper with Navbar / wallet gate ────────────────────────────────────

export function DashboardPage() {
    const { connected } = useWallet();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-1">
                {connected ? <DashboardContent /> : <WalletGate />}
            </main>
            <Footer />
        </div>
    );
}