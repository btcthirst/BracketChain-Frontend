"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, Trophy, X } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import {
    reportResult,
    mapError,
    getTournamentState,
    getEnumKind,
} from "@bracketchain/sdk";
import { toast } from "sonner";

import { useBracketChainClient } from "@/lib/sdk";
import { useConfetti } from "@/hooks/useConfetti";
import type { Match, Player, TournamentView } from "@/types/tournament";

// ── Preset derivation ─────────────────────────────────────────────────────────
//
// We derive the on-chain payout preset from `TournamentView.payouts.length` so
// no new field is needed on the view type. Mirrors PAYOUT_PRESETS in
// useTournamentView.ts (1 = WTA, 3 = Standard, 7 = Deep).

type Preset = "wta" | "standard" | "deep";

function derivePreset(payoutCount: number): Preset {
    if (payoutCount === 7) return "deep";
    if (payoutCount === 3) return "standard";
    return "wta";
}

// ── Final-match detection + placement derivation ─────────────────────────────

function isFinalMatch(match: Match, allMatches: Match[]): boolean {
    const maxRound = Math.max(...allMatches.map((m) => m.round));
    return match.round === maxRound && match.position === 0;
}

function loserOf(match: Match, winner: Player | null): Player | null {
    if (!winner) return null;
    if (match.playerA?.address === winner.address) return match.playerB;
    if (match.playerB?.address === winner.address) return match.playerA;
    return null;
}

function semifinalLosers(allMatches: Match[]): Player[] {
    const maxRound = Math.max(...allMatches.map((m) => m.round));
    return allMatches
        .filter((m) => m.round === maxRound - 1 && m.status === "completed")
        .map((m) => loserOf(m, m.winner))
        .filter((p): p is Player => p !== null);
}

function quarterfinalLosers(allMatches: Match[]): Player[] {
    const maxRound = Math.max(...allMatches.map((m) => m.round));
    return allMatches
        .filter((m) => m.round === maxRound - 2 && m.status === "completed")
        .map((m) => loserOf(m, m.winner))
        .filter((p): p is Player => p !== null);
}

// ── Confirmation-race settle check ───────────────────────────────────────────
//
// Anchor's `.rpc()` throws on slow WS confirmation even when the tx landed.
// After an error, refetch on-chain state: if the action was actually applied
// (match completed for non-final, tournament completed for final), treat as
// success — no scary red toast for a tx that succeeded.

async function didActionSettle(
    sdk: import("@bracketchain/sdk").BracketChainClient,
    tournamentPda: PublicKey,
    onChainRound: number,
    onChainMatchIndex: number,
    isFinal: boolean,
): Promise<boolean> {
    try {
        const fresh = await getTournamentState(sdk, tournamentPda);
        if (isFinal) {
            return getEnumKind(fresh.tournament.status as never) === "completed";
        }
        return fresh.bracket.some((b) => {
            const acc = b.account;
            return (
                acc.round === onChainRound &&
                acc.matchIndex === onChainMatchIndex &&
                getEnumKind(acc.status as never) === "completed"
            );
        });
    } catch {
        // RPC unavailable — fall back to surfacing the original error.
        return false;
    }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportResultModal({
    match,
    tournament,
    onClose,
    onSuccess,
}: {
    match: Match;
    tournament: TournamentView;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const sdk = useBracketChainClient();
    const { fire } = useConfetti();

    const [winner, setWinner] = useState<Player | null>(null);
    const [thirdPlace, setThirdPlace] = useState<Player | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const isFinal = useMemo(
        () => isFinalMatch(match, tournament.matches),
        [match, tournament.matches],
    );
    const preset = useMemo(
        () => derivePreset(tournament.payouts.length),
        [tournament.payouts.length],
    );

    // Final-match placement context
    const sfLosers = useMemo(
        () => (isFinal ? semifinalLosers(tournament.matches) : []),
        [isFinal, tournament.matches],
    );
    const qfLosers = useMemo(
        () => (isFinal && preset === "deep" ? quarterfinalLosers(tournament.matches) : []),
        [isFinal, preset, tournament.matches],
    );

    const needsThird = isFinal && preset !== "wta";
    const canSubmit =
        winner !== null &&
        (!needsThird || thirdPlace !== null) &&
        (preset !== "deep" || qfLosers.length === 4);

    async function handleSubmit() {
        if (!sdk) {
            toast.error("Connect your wallet to report results");
            return;
        }
        if (!winner) return;

        const winnerPk = new PublicKey(winner.address);
        const placements: PublicKey[] = isFinal ? buildPlacements() : [];

        if (isFinal && placements.length === 0) {
            toast.error("Could not derive placements — bracket data incomplete.");
            return;
        }

        setSubmitting(true);
        try {
            const result = await reportResult(sdk, {
                tournamentPda: new PublicKey(tournament.id),
                round: match.round - 1, // UI is 1-indexed; on-chain is 0-indexed
                matchIndex: match.position,
                winner: winnerPk,
                placements: isFinal ? placements : undefined,
            });

            fireSuccess(result.isFinal);
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const error = err as Error;
            if (error.message?.toLowerCase().includes("rejected")) {
                toast.info("Request cancelled");
                return;
            }

            // Confirmation race: Anchor's .rpc() can throw on a slow WS
            // confirmation even though the tx already landed (rewards are
            // distributed, status flips to Completed). Re-read state before
            // surfacing the error so we don't show a red toast for a tx that
            // actually succeeded — the symptom the user reported.
            const settled = await didActionSettle(
                sdk,
                new PublicKey(tournament.id),
                match.round - 1,
                match.position,
                isFinal,
            );
            if (settled) {
                fireSuccess(isFinal);
                onSuccess();
                onClose();
                return;
            }

            const sdkErr = mapError(err);
            toast.error(sdkErr.message);
            console.error("reportResult failed:", err);
        } finally {
            setSubmitting(false);
        }
    }

    function fireSuccess(final: boolean) {
        if (final) {
            toast.success("Champion crowned! Prize pool distributed on-chain.");
            fire();
        } else {
            toast.success(`Round ${match.round} match reported.`);
        }
    }

    function buildPlacements(): PublicKey[] {
        if (!winner) return [];
        const winnerPk = new PublicKey(winner.address);
        const runnerUp = loserOf(match, winner);
        if (!runnerUp) return [];
        const runnerUpPk = new PublicKey(runnerUp.address);

        if (preset === "wta") {
            return [winnerPk];
        }
        if (preset === "standard") {
            if (!thirdPlace) return [];
            return [winnerPk, runnerUpPk, new PublicKey(thirdPlace.address)];
        }
        // deep
        if (!thirdPlace || qfLosers.length !== 4) return [];
        return [
            winnerPk,
            runnerUpPk,
            new PublicKey(thirdPlace.address),
            ...qfLosers.map((p) => new PublicKey(p.address)),
        ];
    }

    const playerPickBtn = (selected: boolean): React.CSSProperties => ({
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderRadius: 10, textAlign: "left", cursor: "pointer",
        border: `2px solid ${selected ? "rgba(34,212,126,0.5)" : "rgba(255,255,255,0.08)"}`,
        background: selected ? "rgba(34,212,126,0.07)" : "rgba(255,255,255,0.02)",
        transition: "border-color 0.15s, background 0.15s",
        width: "100%",
    });

    const sectionLabel: React.CSSProperties = {
        fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", fontWeight: 500,
        color: "rgba(34,212,126,0.55)", textTransform: "uppercase", letterSpacing: "0.08em",
    };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
            <div style={{ background: "rgba(13,15,24,0.98)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.6)", width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 20, padding: 24 }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Trophy style={{ width: 16, height: 16, color: "#22d47e" }} />
                        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#f0f1f5" }}>
                            {isFinal ? "Report Final Result" : `Report — Round ${match.round}, Match ${match.position + 1}`}
                        </h3>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,241,245,0.3)", padding: 4, transition: "color 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "rgba(240,241,245,0.7)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,241,245,0.3)")}
                    >
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Winner picker */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={sectionLabel}>Winner</label>
                    {[match.playerA, match.playerB].map((p) => {
                        const sel = winner?.address === p?.address;
                        return (
                            <button key={p?.address ?? "tbd"} disabled={!p || submitting} onClick={() => p && setWinner(p)} style={{ ...playerPickBtn(sel), opacity: !p ? 0.4 : 1, cursor: !p || submitting ? "not-allowed" : "pointer" }}>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", color: sel ? "#22d47e" : "rgba(240,241,245,0.6)" }}>{p?.display ?? "TBD"}</span>
                                {sel && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", fontWeight: 600, color: "#22d47e", background: "rgba(34,212,126,0.1)", border: "1px solid rgba(34,212,126,0.2)", padding: "1px 7px", borderRadius: 999 }}>Selected</span>}
                            </button>
                        );
                    })}
                </div>

                {/* 3rd place */}
                {needsThird && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={sectionLabel}>3rd Place</label>
                        {sfLosers.length === 0 ? (
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "rgba(245,166,35,0.7)", background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.2)", padding: "10px 12px", borderRadius: 8, lineHeight: 1.5 }}>
                                Waiting for semifinal results — both SF matches must be reported before the final can be finalized.
                            </p>
                        ) : (
                            sfLosers.map((p) => {
                                const sel = thirdPlace?.address === p.address;
                                return (
                                    <button key={p.address} disabled={submitting} onClick={() => setThirdPlace(p)} style={{ ...playerPickBtn(sel), cursor: submitting ? "not-allowed" : "pointer" }}>
                                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", color: sel ? "#22d47e" : "rgba(240,241,245,0.6)" }}>{p.display}</span>
                                        {sel && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", fontWeight: 600, color: "#22d47e" }}>3rd</span>}
                                    </button>
                                );
                            })
                        )}
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "rgba(240,241,245,0.25)", fontStyle: "italic" }}>
                            Pick one of the two semifinal losers. Position 3 is organizer-trusted on-chain (MVP).
                        </p>
                    </div>
                )}

                {/* Deep: 5-8 auto-derived */}
                {isFinal && preset === "deep" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={sectionLabel}>5th–8th (auto: quarterfinal losers)</label>
                        {qfLosers.length !== 4 ? (
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "rgba(245,166,35,0.7)", background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.2)", padding: "10px 12px", borderRadius: 8 }}>
                                Need 4 completed quarterfinals — found {qfLosers.length}.
                            </p>
                        ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {qfLosers.map((p) => (
                                    <span key={p.address} style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "rgba(240,241,245,0.55)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", padding: "3px 10px", borderRadius: 6 }}>
                                        {p.display}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Final payout summary */}
                {isFinal && (
                    <div style={{ background: "rgba(34,212,126,0.05)", border: "1px solid rgba(34,212,126,0.12)", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", fontWeight: 500, color: "rgba(34,212,126,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>On Confirm</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "rgba(240,241,245,0.55)", lineHeight: 1.5 }}>
                            Prize pool of <span style={{ fontWeight: 700, color: "#22d47e" }}>{tournament.prizePool} {tournament.token}</span> will be distributed on-chain in a single transaction (3.5% fee to protocol).
                        </p>
                    </div>
                )}

                {/* Irreversibility warning — applies to both final and non-final
                    matches. The program writes match results to a Match PDA and
                    has no instruction to amend or rewind, so once confirmed the
                    bracket cannot be edited from the UI. */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 8, padding: "10px 12px" }}>
                    <AlertTriangle style={{ width: 16, height: 16, color: "#f5a623", flexShrink: 0, marginTop: 1 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: "#f5a623" }}>
                            Reporting is final
                        </p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "rgba(245,166,35,0.7)", lineHeight: 1.5 }}>
                            {isFinal
                                ? "Once signed, prize payouts are distributed on-chain and cannot be reversed."
                                : "Once signed, the winner advances on-chain. Scores cannot be changed."}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(240,241,245,0.5)", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.875rem", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.4 : 1, transition: "border-color 0.15s, color 0.15s" }}
                        onMouseEnter={e => { if (!submitting) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#f0f1f5"; } }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(240,241,245,0.5)"; }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitting}
                        style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: (!canSubmit || submitting) ? "rgba(255,255,255,0.06)" : "#22d47e", border: "none", color: (!canSubmit || submitting) ? "rgba(240,241,245,0.25)" : "#06070b", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: (!canSubmit || submitting) ? "not-allowed" : "pointer", transition: "background 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        onMouseEnter={e => { if (canSubmit && !submitting) e.currentTarget.style.background = "#16c062"; }}
                        onMouseLeave={e => { if (canSubmit && !submitting) e.currentTarget.style.background = "#22d47e"; }}
                    >
                        {submitting
                            ? <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />{isFinal ? "Distributing…" : "Reporting…"}</>
                            : isFinal ? "Confirm & Distribute" : "Confirm Winner"
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
