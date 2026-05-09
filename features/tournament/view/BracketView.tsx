"use client";

import { useState, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import type { Match, Player } from "@/types/tournament";
import { SOLANA } from "@/constants/links";

// ── Player slot ───────────────────────────────────────────────────────────────

function PlayerSlot({ player, isWinner }: { player: Player | null; isWinner: boolean }) {
    if (!player) {
        return (
            <div style={{ display: "flex", alignItems: "center", height: 32, padding: "0 12px", fontSize: "0.72rem", fontFamily: "'DM Mono', monospace", color: "rgba(240,241,245,0.2)", fontStyle: "italic" }}>
                TBD
            </div>
        );
    }
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                height: 32,
                padding: "0 12px",
                fontSize: "0.72rem",
                fontFamily: "'DM Mono', monospace",
                borderRadius: isWinner ? 4 : 0,
                background: isWinner ? "#22d47e" : "transparent",
                color: isWinner ? "#06070b" : "rgba(240,241,245,0.75)",
                fontWeight: isWinner ? 700 : 400,
                transition: "background 0.15s",
            }}
        >
            {player.display}
        </div>
    );
}

// ── Hover tooltip ─────────────────────────────────────────────────────────────

function MatchTooltip({ match, organizerHint }: { match: Match; organizerHint: boolean }) {
    const statusLabel = { completed: "Completed", in_progress: "In Progress", pending: "Pending" }[match.status];

    return (
        <div
            style={{
                position: "absolute",
                zIndex: 50,
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                width: 208,
                background: "rgba(13,15,24,0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                padding: 12,
                pointerEvents: "none",
                fontSize: "0.72rem",
            }}
        >
            <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid rgba(13,15,24,0.98)" }} />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", color: "rgba(240,241,245,0.45)" }}>
                    Round {match.round} — Match {match.position + 1}
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", color: match.status === "in_progress" ? "#22d47e" : match.status === "completed" ? "#22d47e" : "rgba(240,241,245,0.3)" }}>
                    {statusLabel}
                </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                {[match.playerA, match.playerB].map((p, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "4px 8px",
                            borderRadius: 6,
                            background: match.winner?.address === p?.address ? "rgba(34,212,126,0.12)" : "transparent",
                            color: match.winner?.address === p?.address ? "#22d47e" : "rgba(240,241,245,0.6)",
                            fontFamily: "'DM Mono', monospace",
                        }}
                    >
                        <span>{p?.display ?? "TBD"}</span>
                        {match.result && <span style={{ fontWeight: 700 }}>{i === 0 ? match.result.scoreA : match.result.scoreB}</span>}
                    </div>
                ))}
            </div>

            {match.result && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(240,241,245,0.35)" }}>
                        <span>Reported</span>
                        <span>{new Date(match.result.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <a
                        href={SOLANA.explorerTx(match.result.txSignature)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 4, color: "#22d47e", fontFamily: "'DM Mono', monospace", textDecoration: "none", pointerEvents: "all", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                        {match.result.txSignature.slice(0, 12)}…
                        <ExternalLink style={{ width: 10, height: 10, flexShrink: 0 }} />
                    </a>
                </div>
            )}

            <p style={{ color: "rgba(240,241,245,0.2)", marginTop: 8, fontSize: "0.65rem" }}>
                {organizerHint ? "Click to report winner" : "Click for full details"}
            </p>
        </div>
    );
}

// ── Match node ────────────────────────────────────────────────────────────────

function MatchNode({ match, onClick, organizerActionable }: { match: Match; onClick: (m: Match) => void; organizerActionable: boolean }) {
    const [hovered, setHovered] = useState(false);
    const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const borderStyle = {
        completed:   "2px solid rgba(34,212,126,0.3)",
        in_progress: organizerActionable ? "2px solid rgba(34,212,126,0.7)" : "2px solid rgba(34,212,126,0.4)",
        pending:     "2px solid rgba(255,255,255,0.1)",
    }[match.status];

    const glowStyle = match.status === "in_progress"
        ? { boxShadow: organizerActionable ? "0 0 16px rgba(34,212,126,0.25)" : "0 0 10px rgba(34,212,126,0.12)" }
        : {};

    return (
        <div style={{ position: "relative" }}
            onMouseEnter={() => { hoverTimeout.current = setTimeout(() => setHovered(true), 200); }}
            onMouseLeave={() => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); setHovered(false); }}
        >
            {hovered && <MatchTooltip match={match} organizerHint={organizerActionable} />}
            <button
                onClick={() => onClick(match)}
                style={{
                    position: "relative",
                    width: 176,
                    border: borderStyle,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "rgba(13,15,24,0.9)",
                    cursor: "pointer",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    ...glowStyle,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = match.status === "pending" ? "rgba(255,255,255,0.18)" : "rgba(34,212,126,0.6)"; }}
                onMouseLeave={e => {
                    const base = { completed: "rgba(34,212,126,0.3)", in_progress: organizerActionable ? "rgba(34,212,126,0.7)" : "rgba(34,212,126,0.4)", pending: "rgba(255,255,255,0.1)" }[match.status];
                    e.currentTarget.style.borderColor = base;
                }}
            >
                {match.status === "in_progress" && (
                    <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "#22d47e", animation: "pulse 1.2s ease-in-out infinite" }} />
                )}
                <div>
                    <PlayerSlot player={match.playerA} isWinner={match.winner?.address === match.playerA?.address} />
                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
                    <PlayerSlot player={match.playerB} isWinner={match.winner?.address === match.playerB?.address} />
                </div>
            </button>
        </div>
    );
}

// ── Match detail modal ────────────────────────────────────────────────────────

function MatchModal({ match, onClose }: { match: Match; onClose: () => void }) {
    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
            <div style={{ background: "rgba(13,15,24,0.98)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.6)", width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 20, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "#f0f1f5" }}>
                        Round {match.round} — Match {match.position + 1}
                    </h3>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,241,245,0.3)", transition: "color 0.15s", padding: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "rgba(240,241,245,0.7)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,241,245,0.3)")}
                    >
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[match.playerA, match.playerB].map((p, i) => {
                        const isWinner = match.winner?.address === p?.address;
                        return (
                            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, border: `1px solid ${isWinner ? "rgba(34,212,126,0.3)" : "rgba(255,255,255,0.07)"}`, background: isWinner ? "rgba(34,212,126,0.07)" : "rgba(255,255,255,0.02)" }}>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", color: isWinner ? "#22d47e" : "rgba(240,241,245,0.6)" }}>{p?.display ?? "TBD"}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {match.result && <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "0.9rem", color: "#f0f1f5" }}>{i === 0 ? match.result.scoreA : match.result.scoreB}</span>}
                                    {isWinner && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", fontWeight: 600, color: "#22d47e", background: "rgba(34,212,126,0.1)", border: "1px solid rgba(34,212,126,0.2)", padding: "1px 7px", borderRadius: 999 }}>Winner</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Mono', monospace", fontSize: "0.72rem" }}>
                        <span style={{ color: "rgba(240,241,245,0.3)" }}>Status</span>
                        <span style={{ color: "#f0f1f5", textTransform: "capitalize" }}>{match.status.replace("_", " ")}</span>
                    </div>
                    {match.result && (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Mono', monospace", fontSize: "0.72rem" }}>
                                <span style={{ color: "rgba(240,241,245,0.3)" }}>Reported</span>
                                <span style={{ color: "#f0f1f5" }}>{new Date(match.result.timestamp).toLocaleString()}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "'DM Mono', monospace", fontSize: "0.72rem" }}>
                                <span style={{ color: "rgba(240,241,245,0.3)" }}>Transaction</span>
                                <a href={SOLANA.explorerTx(match.result.txSignature)} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, color: "#22d47e", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
                                    {match.result.txSignature.slice(0, 8)}…
                                    <ExternalLink style={{ width: 11, height: 11, flexShrink: 0 }} />
                                </a>
                            </div>
                        </>
                    )}
                </div>

                <button
                    onClick={onClose}
                    style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(240,241,245,0.5)", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#f0f1f5"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(240,241,245,0.5)"; }}
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
        <div style={{ display: "flex", gap: 48, padding: 24, overflowX: "auto" }}>
            {[4, 2, 1].map((count, ri) => (
                <div key={ri} style={{ display: "flex", flexDirection: "column", gap: 24, justifyContent: "space-around", minWidth: 176 }}>
                    {Array.from({ length: count }).map((_, i) => (
                        <div key={i} style={{ width: 176, border: "2px solid rgba(255,255,255,0.07)", borderRadius: 8, overflow: "hidden", animation: "pulse 1.5s ease-in-out infinite" }}>
                            <div style={{ height: 32, background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }} />
                            <div style={{ height: 32, background: "rgba(255,255,255,0.03)" }} />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// ── Empty bracket ─────────────────────────────────────────────────────────────

export function BracketEmpty({ onJoin, isRegistered = false }: { onJoin?: () => void; isRegistered?: boolean }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 16, textAlign: "center" }}>
            <svg viewBox="0 0 200 120" style={{ width: 192, height: 112, color: "rgba(34,212,126,0.12)" }} fill="none">
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
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#f0f1f5" }}>You&apos;re registered!</p>
                    <p style={{ fontSize: "0.85rem", color: "rgba(240,241,245,0.35)", maxWidth: 280 }}>
                        Waiting for the organizer to start the tournament. The bracket will appear here once it begins.
                    </p>
                </>
            ) : (
                <>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "rgba(240,241,245,0.5)" }}>Waiting for players…</p>
                    <p style={{ fontSize: "0.85rem", color: "rgba(240,241,245,0.3)" }}>The bracket will appear once the tournament starts.</p>
                    {onJoin && (
                        <button
                            onClick={onJoin}
                            style={{ marginTop: 8, padding: "10px 24px", background: "#22d47e", color: "#06070b", border: "none", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", boxShadow: "0 0 18px rgba(34,212,126,0.28)", transition: "background 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#16c062")}
                            onMouseLeave={e => (e.currentTarget.style.background = "#22d47e")}
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

export function BracketView({ matches, isOrganizer = false, onReport }: { matches: Match[]; isOrganizer?: boolean; onReport?: (m: Match) => void }) {
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    const handleMatchClick = (m: Match) => {
        if (isOrganizer && m.status === "in_progress" && onReport) { onReport(m); return; }
        setSelectedMatch(m);
    };

    const rounds = Array.from(new Set(matches.map(m => m.round))).sort();

    return (
        <>
            <div style={{ overflowX: "auto" }}>
                <div style={{ display: "flex", gap: 32, padding: 24, alignItems: "center", minWidth: "max-content" }}>
                    {rounds.map((round, ri) => {
                        const roundMatches = matches.filter(m => m.round === round).sort((a, b) => a.position - b.position);
                        const gap = `${(ri + 1) * 16}px`;

                        return (
                            <div key={round} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", fontWeight: 500, color: "rgba(240,241,245,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                                    {round === Math.max(...rounds) ? "Final" : `Round ${round}`}
                                </span>
                                <div style={{ display: "flex", flexDirection: "column", gap }}>
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

            {selectedMatch && <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
        </>
    );
}
