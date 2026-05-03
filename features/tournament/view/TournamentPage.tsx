"use client";

import Link from "next/link";
import { RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ROUTES, SOLANA } from "@/constants/links";
import { useTournamentView } from "../../../hooks/useTournamentView";
import { TournamentHeader } from "./TournamentHeader";
import { BracketView, BracketSkeleton, BracketEmpty } from "./BracketView";
import { TournamentSidebar, SidebarSkeleton } from "./TournamentSidebar";

// ── Edge state: not found ─────────────────────────────────────────────────────

function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
                🏆
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Tournament not found</h1>
            <p className="text-gray-500 max-w-sm">
                It may have been closed, cancelled, or the link is incorrect.
            </p>
            <Link
                href={ROUTES.explore}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
                Browse tournaments →
            </Link>
        </div>
    );
}

// ── Edge state: error ─────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
            <RefreshCw className="w-10 h-10 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-700">Failed to load tournament</h2>
            <p className="text-sm text-gray-500">Check your connection and try again.</p>
            <button
                onClick={onRetry}
                className="flex items-center gap-2 border border-gray-300 hover:border-gray-400 px-5 py-2.5 rounded-lg font-medium text-gray-700 transition-colors"
            >
                <RefreshCw className="w-4 h-4" />
                Try again
            </button>
        </div>
    );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
    return (
        <div className="animate-pulse">
            {/* Header skeleton */}
            <div className="bg-[#0a1929] py-8">
                <div className="container mx-auto px-6 flex flex-col gap-4">
                    <div className="flex gap-2">
                        <div className="h-6 w-32 bg-white/10 rounded-full" />
                        <div className="h-6 w-24 bg-white/10 rounded-full" />
                    </div>
                    <div className="h-10 w-72 bg-white/10 rounded-lg" />
                    <div className="grid grid-cols-4 gap-6 mt-4 pt-4 border-t border-white/10">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="flex flex-col gap-2">
                                <div className="h-3 w-20 bg-white/10 rounded" />
                                <div className="h-6 w-28 bg-white/10 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Content skeleton */}
            <div className="container mx-auto px-6 py-8">
                <div className="grid lg:grid-cols-[1fr_320px] gap-8">
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <BracketSkeleton />
                    </div>
                    <SidebarSkeleton />
                </div>
            </div>
        </div>
    );
}

// ── Cancelled banner ──────────────────────────────────────────────────────────

function CancelledBanner({
    txSignature,
    refundTxs,
}: {
    txSignature: string | null;
    refundTxs: string[];
}) {
    return (
        <div className="bg-red-50 border-b border-red-200">
            <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">
                        This tournament was cancelled. All entry fees have been refunded.
                    </p>
                    {refundTxs.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                            {refundTxs.map((tx, i) => (
                                <a
                                    key={tx}
                                    href={`${SOLANA.explorerTx(tx)}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline font-mono"
                                >
                                    Refund #{i + 1}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
                {txSignature && (
                    <a
                        href={`${SOLANA.explorerTx(txSignature)}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline shrink-0"
                    >
                        Cancel tx <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TournamentPage({ id }: { id: string }) {
    const { state, refresh } = useTournamentView(id);
    const { publicKey } = useWallet();
    const currentAddress = publicKey?.toBase58() ?? null;
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />

            <main className="flex-1">
                {state.status === "loading" && <LoadingSkeleton />}
                {state.status === "not_found" && <NotFound />}
                {state.status === "error" && <ErrorState onRetry={refresh} />}

                {state.status === "success" && (() => {
                    const t = state.data;
                    const hasBracket = t.matches && t.matches.length > 0;

                    return (
                        <>
                            {t.status === "cancelled" && (
                                <CancelledBanner
                                    txSignature={t.cancelledTxSignature}
                                    refundTxs={t.refundTxSignatures}
                                />
                            )}

                            <TournamentHeader tournament={t} />

                            <div className="container mx-auto px-6 py-8">
                                <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">

                                    {/* Bracket panel */}
                                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                        <div className="border-b border-gray-100 px-5 py-3">
                                            <h2 className="text-sm font-semibold text-gray-700">Bracket</h2>
                                        </div>
                                        {!hasBracket
                                            ? <BracketEmpty
                                                onJoin={t.status === "registration"
                                                    ? () => document.getElementById("join-btn")?.click()
                                                    : undefined
                                                }
                                                // Pass whether current user is already a participant
                                                // so the empty state can show a more relevant message
                                                isRegistered={t.participants.some(
                                                    p => p.address === currentAddress
                                                )}
                                            />
                                            : <BracketView matches={t.matches} />
                                        }
                                    </div>

                                    {/* Sidebar — receives refresh so it can trigger
                                        a data reload after a successful join */}
                                    <TournamentSidebar
                                        tournament={t}
                                        currentAddress={currentAddress}
                                        onJoinSuccess={refresh}
                                    />
                                </div>
                            </div>
                        </>
                    );
                })()}
            </main>

            <Footer />
        </div>
    );
}