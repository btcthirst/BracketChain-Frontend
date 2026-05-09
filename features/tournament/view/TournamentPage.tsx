"use client";

import { useState } from "react";
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
import { ReportResultModal } from "./ReportResultModal";
import type { Match } from "@/types/tournament";

const darkPanel: React.CSSProperties = {
    background: "rgba(13,15,24,0.85)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    overflow: "hidden",
};

function NotFound() {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20, textAlign: "center", padding: "0 24px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,212,126,0.06)", border: "1px solid rgba(34,212,126,0.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem" }}>
                🏆
            </div>
            <div>
                <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.5rem", color: "#f0f1f5", marginBottom: 8 }}>
                    Tournament not found
                </h1>
                <p style={{ fontSize: "0.9rem", color: "rgba(240,241,245,0.42)", maxWidth: 340 }}>
                    It may have been closed, cancelled, or the link is incorrect.
                </p>
            </div>
            <Link
                href={ROUTES.explore}
                style={{ padding: "10px 24px", background: "#22d47e", color: "#06070b", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none", boxShadow: "0 0 18px rgba(34,212,126,0.28)", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#16c062")}
                onMouseLeave={e => (e.currentTarget.style.background = "#22d47e")}
            >
                Browse tournaments →
            </Link>
        </div>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16, textAlign: "center", padding: "0 24px" }}>
            <RefreshCw style={{ width: 40, height: 40, color: "rgba(240,78,102,0.4)" }} />
            <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#f0f1f5", marginBottom: 6 }}>
                    Failed to load tournament
                </h2>
                <p style={{ fontSize: "0.85rem", color: "rgba(240,241,245,0.35)" }}>Check your connection and try again.</p>
            </div>
            <button
                onClick={onRetry}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "rgba(240,241,245,0.5)", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; e.currentTarget.style.color = "#f0f1f5"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(240,241,245,0.5)"; }}
            >
                <RefreshCw style={{ width: 14, height: 14 }} />
                Try again
            </button>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
            {/* Header skeleton */}
            <div style={{ background: "rgba(6,7,11,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px" }}>
                <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ height: 24, width: 128, background: "rgba(255,255,255,0.07)", borderRadius: 999 }} />
                        <div style={{ height: 24, width: 96, background: "rgba(255,255,255,0.07)", borderRadius: 999 }} />
                    </div>
                    <div style={{ height: 40, width: 280, background: "rgba(255,255,255,0.07)", borderRadius: 8 }} />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginTop: 8, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <div style={{ height: 10, width: 80, background: "rgba(255,255,255,0.07)", borderRadius: 4 }} />
                                <div style={{ height: 20, width: 110, background: "rgba(255,255,255,0.07)", borderRadius: 4 }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Content skeleton */}
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}>
                    <div style={darkPanel}><BracketSkeleton /></div>
                    <SidebarSkeleton />
                </div>
            </div>
        </div>
    );
}

function CancelledBanner({ txSignature, refundTxs }: { txSignature: string | null; refundTxs: string[] }) {
    return (
        <div style={{ background: "rgba(240,78,102,0.07)", borderBottom: "1px solid rgba(240,78,102,0.18)" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <AlertTriangle style={{ width: 16, height: 16, color: "#f04e66", flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "#f04e66", marginBottom: refundTxs.length > 0 ? 4 : 0 }}>
                        This tournament was cancelled. All entry fees have been refunded.
                    </p>
                    {refundTxs.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {refundTxs.map((tx, i) => (
                                <a key={tx} href={`${SOLANA.explorerTx(tx)}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "rgba(240,78,102,0.7)", textDecoration: "none" }}
                                    onMouseEnter={e => (e.currentTarget.style.color = "#f04e66")}
                                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,78,102,0.7)")}
                                >
                                    Refund #{i + 1} <ExternalLink style={{ width: 10, height: 10 }} />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
                {txSignature && (
                    <a href={`${SOLANA.explorerTx(txSignature)}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "rgba(240,78,102,0.7)", textDecoration: "none", flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#f04e66")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,78,102,0.7)")}
                    >
                        Cancel tx <ExternalLink style={{ width: 10, height: 10 }} />
                    </a>
                )}
            </div>
        </div>
    );
}

export function TournamentPage({ id }: { id: string }) {
    const { state, refresh } = useTournamentView(id);
    const { publicKey } = useWallet();
    const currentAddress = publicKey?.toBase58() ?? null;
    const [reportingMatch, setReportingMatch] = useState<Match | null>(null);

    const isOrganizer =
        state.status === "success" &&
        state.data.organizer.address === currentAddress;

    return (
        <div style={{ minHeight: "100vh", background: "transparent", display: "flex", flexDirection: "column" }}>
            <Navbar />

            <main style={{ flex: 1 }}>
                {state.status === "loading"   && <LoadingSkeleton />}
                {state.status === "not_found" && <NotFound />}
                {state.status === "error"     && <ErrorState onRetry={refresh} />}

                {state.status === "success" && (() => {
                    const t = state.data;
                    const hasBracket = t.matches && t.matches.length > 0;

                    return (
                        <>
                            {t.status === "cancelled" && (
                                <CancelledBanner txSignature={t.cancelledTxSignature} refundTxs={t.refundTxSignatures} />
                            )}

                            <TournamentHeader tournament={t} />

                            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }} className="lg:grid-cols-[1fr_320px] grid-cols-1">

                                    {/* Bracket panel */}
                                    <div style={darkPanel}>
                                        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 20px" }}>
                                            <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", fontWeight: 500, color: "rgba(240,241,245,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                                Bracket
                                            </h2>
                                        </div>
                                        {!hasBracket
                                            ? <BracketEmpty
                                                onJoin={t.status === "registration" ? () => document.getElementById("join-btn")?.click() : undefined}
                                                isRegistered={t.participants.some(p => p.address === currentAddress)}
                                            />
                                            : <BracketView
                                                matches={t.matches}
                                                isOrganizer={isOrganizer && t.status === "in_progress" && t.bracketReady}
                                                onReport={setReportingMatch}
                                            />
                                        }
                                    </div>

                                    <TournamentSidebar
                                        tournament={t}
                                        currentAddress={currentAddress}
                                        onJoinSuccess={refresh}
                                    />
                                </div>
                            </div>

                            {reportingMatch && (
                                <ReportResultModal
                                    match={reportingMatch}
                                    tournament={t}
                                    onClose={() => setReportingMatch(null)}
                                    onSuccess={refresh}
                                />
                            )}
                        </>
                    );
                })()}
            </main>

            <Footer />
        </div>
    );
}
