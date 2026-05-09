"use client";

import { useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { reportResult, mapError } from "@bracketchain/sdk";
import { toast } from "sonner";
import type { Match, Player } from "@/types/tournament";
import { useBracketChainClient } from "@/lib/sdk";

interface Props {
    match: Match;
    tournamentId: string;
    allMatches: Match[];
    participants: Player[];
    onClose: () => void;
    onSuccess: () => void;
}

export function ReportResultModal({ match, tournamentId, allMatches, participants, onClose, onSuccess }: Props) {
    const sdk = useBracketChainClient();
    const [winnerId, setWinnerId] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const players = [match.playerA, match.playerB].filter(Boolean) as Player[];

    const maxRound = Math.max(...allMatches.map(m => m.round));
    const isFinal =
        match.round === maxRound &&
        allMatches.filter(m => m.round === maxRound).length === 1;

    function buildPlacements(winnerId: string): PublicKey[] {
        if (!match.playerA || !match.playerB) return [];
        const loserId =
            match.playerA.address === winnerId
                ? match.playerB.address
                : match.playerA.address;
        const finalistsSet = new Set([winnerId, loserId]);
        const others = participants
            .filter(p => !finalistsSet.has(p.address))
            .map(p => {
                const deepest = Math.max(
                    ...allMatches
                        .filter(m => m.playerA?.address === p.address || m.playerB?.address === p.address)
                        .map(m => m.round),
                    0,
                );
                return { address: p.address, deepest };
            })
            .sort((a, b) => b.deepest - a.deepest)
            .map(p => new PublicKey(p.address));
        return [new PublicKey(winnerId), new PublicKey(loserId), ...others];
    }

    async function handleSubmit() {
        if (!winnerId) return;
        if (!sdk) { setError("Wallet not connected."); return; }
        setSubmitting(true);
        setError("");
        try {
            await reportResult(sdk, {
                tournamentPda: new PublicKey(tournamentId),
                round: match.round - 1,
                matchIndex: match.position,
                winner: new PublicKey(winnerId),
                ...(isFinal ? { placements: buildPlacements(winnerId) } : {}),
            });
            toast.success("Result reported successfully!");
            onSuccess();
            onClose();
        } catch (err) {
            const msg = mapError(err).message;
            setError(msg);
            toast.error(`Failed to report result. ${msg} Retry.`);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(4px)",
            }}
        >
            <div
                style={{
                    background: "rgba(13,15,24,0.98)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 16,
                    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
                    width: "100%",
                    maxWidth: 400,
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    padding: 24,
                }}
            >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#f0f1f5" }}>
                            Report Result
                        </h3>
                        {isFinal && (
                            <span
                                style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "0.62rem",
                                    fontWeight: 600,
                                    color: "#f5a623",
                                    background: "rgba(245,166,35,0.08)",
                                    border: "1px solid rgba(245,166,35,0.2)",
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    width: "fit-content",
                                }}
                            >
                                Final Match — placements will be recorded
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,241,245,0.3)", transition: "color 0.15s", padding: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "rgba(240,241,245,0.7)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,241,245,0.3)")}
                    >
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Match info */}
                <div
                    style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 10,
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "rgba(240,241,245,0.35)" }}>
                        Round {match.round} — Match {match.position + 1}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "rgba(240,241,245,0.5)" }}>
                        {match.playerA?.display ?? "TBD"} vs {match.playerB?.display ?? "TBD"}
                    </span>
                </div>

                {/* Winner selector */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label
                        style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "0.68rem",
                            fontWeight: 500,
                            color: "rgba(34,212,126,0.55)",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                        }}
                    >
                        Select Winner
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {players.map(p => {
                            const selected = winnerId === p.address;
                            return (
                                <button
                                    key={p.address}
                                    onClick={() => setWinnerId(p.address)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "12px 16px",
                                        borderRadius: 10,
                                        border: `2px solid ${selected ? "rgba(34,212,126,0.5)" : "rgba(255,255,255,0.08)"}`,
                                        background: selected ? "rgba(34,212,126,0.07)" : "rgba(255,255,255,0.02)",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        transition: "border-color 0.15s, background 0.15s",
                                    }}
                                    onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
                                    onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                                >
                                    <div
                                        style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: "50%",
                                            border: `2px solid ${selected ? "#22d47e" : "rgba(255,255,255,0.2)"}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                            transition: "border-color 0.15s",
                                        }}
                                    >
                                        {selected && (
                                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d47e" }} />
                                        )}
                                    </div>
                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", color: selected ? "#f0f1f5" : "rgba(240,241,245,0.55)" }}>
                                        {p.display}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            background: "rgba(240,78,102,0.07)",
                            border: "1px solid rgba(240,78,102,0.2)",
                            borderRadius: 8,
                            padding: "10px 14px",
                        }}
                    >
                        <AlertCircle style={{ width: 15, height: 15, color: "#f04e66", flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "rgba(240,78,102,0.8)" }}>{error}</p>
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        style={{
                            flex: 1,
                            padding: "10px 0",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "transparent",
                            color: "rgba(240,241,245,0.5)",
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            cursor: submitting ? "not-allowed" : "pointer",
                            opacity: submitting ? 0.4 : 1,
                            transition: "border-color 0.15s, color 0.15s",
                        }}
                        onMouseEnter={e => { if (!submitting) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#f0f1f5"; } }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(240,241,245,0.5)"; }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!winnerId || submitting}
                        style={{
                            flex: 1,
                            padding: "10px 0",
                            borderRadius: 10,
                            background: (!winnerId || submitting) ? "rgba(255,255,255,0.06)" : "#22d47e",
                            border: "none",
                            color: (!winnerId || submitting) ? "rgba(240,241,245,0.25)" : "#06070b",
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            cursor: (!winnerId || submitting) ? "not-allowed" : "pointer",
                            transition: "background 0.15s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                        }}
                        onMouseEnter={e => { if (winnerId && !submitting) e.currentTarget.style.background = "#16c062"; }}
                        onMouseLeave={e => { if (winnerId && !submitting) e.currentTarget.style.background = "#22d47e"; }}
                    >
                        {submitting
                            ? <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Signing…</>
                            : "Confirm Result"
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
