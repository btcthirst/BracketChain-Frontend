"use client";

import { useState } from "react";
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { Match } from "@/types/tournament";
import { useTournamentView } from "@/hooks/useTournamentView";
import { BracketView, BracketEmpty, BracketSkeleton } from "@/features/tournament/view/BracketView";
import { ReportResultModal } from "./ReportResultModal";
import { CancelModal } from "./CancelModal";

interface Props {
    tournamentId: string;
    onBack: () => void;
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
    registration: { background: "rgba(34,212,126,0.08)", color: "#22d47e", border: "1px solid rgba(34,212,126,0.2)" },
    in_progress:  { background: "rgba(34,212,126,0.08)", color: "#22d47e", border: "1px solid rgba(34,212,126,0.2)" },
    completed:    { background: "rgba(255,255,255,0.05)", color: "rgba(240,241,245,0.35)", border: "1px solid rgba(255,255,255,0.08)" },
    cancelled:    { background: "rgba(240,78,102,0.08)", color: "#f04e66", border: "1px solid rgba(240,78,102,0.2)" },
};
const STATUS_LABELS: Record<string, string> = {
    registration: "Registration Open",
    in_progress:  "In Progress",
    completed:    "Completed",
    cancelled:    "Cancelled",
};

const darkPanel: React.CSSProperties = {
    background: "rgba(13,15,24,0.85)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    overflow: "hidden",
};

export function ManageView({ tournamentId, onBack }: Props) {
    const { publicKey } = useWallet();
    const { state, refresh } = useTournamentView(tournamentId);
    const [reportMatch, setReportMatch] = useState<Match | null>(null);
    const [showCancel, setShowCancel] = useState(false);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Sub-page top bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button
                    onClick={onBack}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "none",
                        border: "none",
                        color: "rgba(240,241,245,0.4)",
                        fontSize: "0.875rem",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#f0f1f5")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,241,245,0.4)")}
                >
                    <ArrowLeft style={{ width: 16, height: 16 }} />
                    Back to Dashboard
                </button>

                {state.status === "success" && (
                    <>
                        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
                        <h2
                            style={{
                                fontFamily: "'Syne', sans-serif",
                                fontWeight: 700,
                                fontSize: "1rem",
                                color: "#f0f1f5",
                            }}
                        >
                            {state.data.name}
                        </h2>
                        <span
                            style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "0.65rem",
                                fontWeight: 600,
                                padding: "3px 10px",
                                borderRadius: 999,
                                ...(STATUS_STYLES[state.data.status] ?? STATUS_STYLES.completed),
                            }}
                        >
                            {STATUS_LABELS[state.data.status] ?? state.data.status}
                        </span>
                        <button
                            onClick={refresh}
                            title="Refresh"
                            style={{
                                marginLeft: "auto",
                                padding: 8,
                                background: "none",
                                border: "none",
                                color: "rgba(240,241,245,0.3)",
                                cursor: "pointer",
                                borderRadius: 8,
                                transition: "color 0.15s, background 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#22d47e"; e.currentTarget.style.background = "rgba(34,212,126,0.06)"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "rgba(240,241,245,0.3)"; e.currentTarget.style.background = "none"; }}
                        >
                            <RefreshCw style={{ width: 16, height: 16 }} />
                        </button>
                    </>
                )}
            </div>

            {/* Loading */}
            {state.status === "loading" && (
                <div style={darkPanel}>
                    <BracketSkeleton />
                </div>
            )}

            {/* Error */}
            {state.status === "error" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "64px 24px", textAlign: "center" }}>
                    <AlertCircle style={{ width: 32, height: 32, color: "rgba(240,78,102,0.5)" }} />
                    <p style={{ fontSize: "0.875rem", color: "rgba(240,241,245,0.35)" }}>Failed to load tournament data.</p>
                    <button
                        onClick={refresh}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", fontSize: "0.875rem", color: "#22d47e", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                    >
                        <RefreshCw style={{ width: 14, height: 14 }} /> Retry
                    </button>
                </div>
            )}

            {/* Not found */}
            {state.status === "not_found" && (
                <div style={{ padding: "64px 24px", textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: "0.85rem", color: "rgba(240,241,245,0.25)" }}>
                    Tournament not found.
                </div>
            )}

            {/* Success */}
            {state.status === "success" && (() => {
                const t = state.data;
                const hasBracket = t.matches.length > 0;
                const activeMatches = t.matches.filter(m => m.status === "in_progress");

                const isOrganizer = t.organizer.address === publicKey?.toBase58();
                const canCancel =
                    isOrganizer && (
                        t.status === "registration" ||
                        (t.status === "in_progress" && t.matches.every(m => m.status === "pending"))
                    );

                return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                        {/* Bracket panel */}
                        <div style={darkPanel}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                                    padding: "12px 20px",
                                }}
                            >
                                <h3
                                    style={{
                                        fontFamily: "'DM Mono', monospace",
                                        fontSize: "0.68rem",
                                        fontWeight: 500,
                                        color: "rgba(240,241,245,0.3)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.08em",
                                    }}
                                >
                                    Bracket
                                </h3>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "rgba(240,241,245,0.3)" }}>
                                    <span style={{ color: "#f0f1f5", fontWeight: 600 }}>{t.participants.length}</span>/{t.maxParticipants} participants
                                </span>
                            </div>
                            {!hasBracket ? <BracketEmpty /> : <BracketView matches={t.matches} />}
                        </div>

                        {/* Active matches */}
                        {activeMatches.length > 0 && (
                            <div style={darkPanel}>
                                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 8 }}>
                                    <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", fontWeight: 500, color: "rgba(240,241,245,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                        Active Matches
                                    </h3>
                                    <span
                                        style={{
                                            fontFamily: "'DM Mono', monospace",
                                            fontSize: "0.62rem",
                                            fontWeight: 600,
                                            padding: "2px 8px",
                                            borderRadius: 999,
                                            background: "rgba(34,212,126,0.1)",
                                            color: "#22d47e",
                                            border: "1px solid rgba(34,212,126,0.2)",
                                        }}
                                    >
                                        {activeMatches.length}
                                    </span>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    {activeMatches.map(match => (
                                        <div
                                            key={match.id}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "14px 20px",
                                                borderBottom: "1px solid rgba(255,255,255,0.04)",
                                            }}
                                        >
                                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: "#f0f1f5" }}>
                                                    Round {match.round} — Match {match.position + 1}
                                                </span>
                                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "rgba(240,241,245,0.35)" }}>
                                                    {match.playerA?.display ?? "TBD"} vs {match.playerB?.display ?? "TBD"}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setReportMatch(match)}
                                                style={{
                                                    padding: "7px 16px",
                                                    background: "#22d47e",
                                                    color: "#06070b",
                                                    border: "none",
                                                    borderRadius: 8,
                                                    fontFamily: "'Inter', sans-serif",
                                                    fontWeight: 700,
                                                    fontSize: "0.75rem",
                                                    cursor: "pointer",
                                                    transition: "background 0.15s",
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = "#16c062")}
                                                onMouseLeave={e => (e.currentTarget.style.background = "#22d47e")}
                                            >
                                                Report Result
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Danger zone */}
                        {canCancel && (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    background: "rgba(240,78,102,0.06)",
                                    border: "1px solid rgba(240,78,102,0.18)",
                                    borderRadius: 12,
                                    padding: "16px 20px",
                                    gap: 16,
                                    flexWrap: "wrap",
                                }}
                            >
                                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.875rem", color: "#f04e66" }}>
                                        Cancel Tournament
                                    </p>
                                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "rgba(240,78,102,0.6)" }}>
                                        All entry fees will be refunded. This cannot be undone.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowCancel(true)}
                                    style={{
                                        padding: "8px 18px",
                                        background: "rgba(240,78,102,0.12)",
                                        color: "#f04e66",
                                        border: "1px solid rgba(240,78,102,0.3)",
                                        borderRadius: 8,
                                        fontFamily: "'Inter', sans-serif",
                                        fontWeight: 700,
                                        fontSize: "0.78rem",
                                        cursor: "pointer",
                                        flexShrink: 0,
                                        transition: "background 0.15s",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(240,78,102,0.2)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(240,78,102,0.12)")}
                                >
                                    Cancel Tournament
                                </button>
                            </div>
                        )}

                        {/* Modals */}
                        {reportMatch && (
                            <ReportResultModal
                                match={reportMatch}
                                tournamentId={tournamentId}
                                allMatches={t.matches}
                                participants={t.participants}
                                onClose={() => setReportMatch(null)}
                                onSuccess={refresh}
                            />
                        )}
                        {showCancel && (
                            <CancelModal
                                tournamentId={tournamentId}
                                tournamentName={t.name}
                                onClose={() => setShowCancel(false)}
                                onSuccess={() => { setShowCancel(false); onBack(); }}
                            />
                        )}
                    </div>
                );
            })()}
        </div>
    );
}
