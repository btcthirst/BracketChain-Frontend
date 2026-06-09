"use client";

import { Radio, ShieldCheck } from "lucide-react";

import type { Match, TournamentView } from "@/types/tournament";

// ── Styling primitives ────────────────────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "0.74rem",
    color: "rgba(240,241,245,0.6)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
};

const fieldShell: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.78rem",
    color: "rgba(240,241,245,0.85)",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "10px 12px",
    wordBreak: "break-all",
};

const helperText: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.76rem",
    color: "rgba(240,241,245,0.55)",
    lineHeight: 1.5,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncateHex(hex: string, head = 8, tail = 6): string {
    if (hex.length <= head + tail + 2) return hex;
    return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

function relativeFromNow(iso: string | null): string | null {
    if (!iso) return null;
    const diffMs = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diffMs / 60_000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ${min % 60}m ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ${hr % 24}h ago`;
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
    tournament: TournamentView;
    match: Match;
}

/**
 * Stage C (V1.2 Oracle) — read-only audit panel rendered for Oracle-mode
 * matches that have been committed + feed-bound but for which the relayer has
 * not yet pushed `propose_result_oracle`. Surfaces the committed identities +
 * feed binding for verification, and explains the next step (oracle relayer
 * pushing the result). Once the relayer fires, the modal flips into the
 * existing `pending_confirmation` flow rendered by ReportResultModal.
 */
export function OraclePendingPanel({ tournament, match }: Props) {
    const o = match.oracle;
    const committedAgo = relativeFromNow(o.committedAt);

    return (
        <>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(34,212,126,0.05)", border: "1px solid rgba(34,212,126,0.2)", borderRadius: 8, padding: "12px 14px" }}>
                <Radio style={{ width: 16, height: 16, color: "#22d47e", flexShrink: 0, marginTop: 2 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "#22d47e" }}>Awaiting oracle result</p>
                    <p style={{ ...helperText, color: "rgba(240,241,245,0.65)" }}>
                        The match is committed and the feed is bound. A permissionless relayer pushes <code style={{ fontFamily: "'DM Mono', monospace", background: "rgba(34,212,126,0.08)", padding: "0 4px", borderRadius: 4 }}>propose_result_oracle</code> automatically once the feed resolves; the dispute window then opens for {tournament.arbitrator ? "the arbitrator and both players" : "both players"}.
                    </p>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={sectionLabel}>Lobby ID</label>
                <div style={fieldShell}>0x{o.lobbyId ?? "—"}</div>
                {committedAgo && (
                    <p style={helperText}>Committed {committedAgo}.</p>
                )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={sectionLabel}>Switchboard feed</label>
                <div style={fieldShell}>{o.switchboardFeed ?? "—"}</div>
            </div>

            {(o.playerAGameId || o.playerBGameId || o.expectedFeedHash) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                    <label style={sectionLabel}>Commitment audit</label>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontFamily: "'DM Mono', monospace", fontSize: "0.74rem", color: "rgba(240,241,245,0.6)" }}>
                        {o.playerAGameId && (
                            <>
                                <span>Player A:</span>
                                <span title={o.playerAGameId} style={{ color: "rgba(240,241,245,0.85)" }}>{truncateHex(o.playerAGameId)}</span>
                            </>
                        )}
                        {o.playerBGameId && (
                            <>
                                <span>Player B:</span>
                                <span title={o.playerBGameId} style={{ color: "rgba(240,241,245,0.85)" }}>{truncateHex(o.playerBGameId)}</span>
                            </>
                        )}
                        {o.expectedFeedHash && (
                            <>
                                <span>Feed hash:</span>
                                <span title={o.expectedFeedHash} style={{ color: "rgba(240,241,245,0.85)" }}>{truncateHex(o.expectedFeedHash)}</span>
                            </>
                        )}
                    </div>
                    <p style={helperText}>
                        These are the identity hashes the feed must answer for. Mismatch ⇒ the program rejects the proposal.
                    </p>
                </div>
            )}

            {tournament.arbitrator && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "'Inter', sans-serif", fontSize: "0.76rem", color: "rgba(240,241,245,0.6)", paddingTop: 4 }}>
                    <ShieldCheck style={{ width: 14, height: 14, color: "rgba(240,241,245,0.5)", flexShrink: 0, marginTop: 2 }} />
                    <span>
                        Arbitrator: <code style={{ fontFamily: "'DM Mono', monospace", color: "rgba(240,241,245,0.8)" }}>{tournament.arbitrator.slice(0, 4)}…{tournament.arbitrator.slice(-4)}</code> — can resolve a disputed oracle proposal alongside both players.
                    </span>
                </div>
            )}
        </>
    );
}
