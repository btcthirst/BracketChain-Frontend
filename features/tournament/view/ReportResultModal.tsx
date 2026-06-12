"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Gavel, Loader2, Radio, ShieldAlert, Trophy } from "lucide-react";
import { address, type Address } from "@solana/kit";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import {
    reportResult,
    proposeResult,
    confirmResult,
    disputeResult,
    claimResult,
    resolveDispute,
    forceClaimDisputed,
    settleFinal,
    getTournamentState,
    MatchStatus,
    TournamentStatus,
    type BracketChainClient,
} from "@bracketchain/sdk";
import { toast } from "sonner";

import { useBracketChainClient } from "@/lib/sdk";
import { handleTxError } from "@/lib/txErrors";
import { useConfetti } from "@/hooks/useConfetti";
import { useDeadlineReached } from "@/hooks/useDeadlineReached";
import type { Match, Player, TournamentView } from "@/types/tournament";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CommitAndBindPanel } from "./CommitAndBindPanel";
import { OraclePendingPanel } from "./OraclePendingPanel";

// ── Preset derivation ─────────────────────────────────────────────────────────
//
// Derive the on-chain payout preset from `TournamentView.payouts.length`.
// buildPayouts always emits exactly the preset's entries (WTA=1, Standard=3,
// Deep=7), so the count is an exact discriminator. Drives whether the final
// match needs a placements array on finalization.

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

// ── Dispute reasons (u8 codes recorded on-chain; PRD §5 `dispute_reason`) ─────

const DISPUTE_REASONS: { code: number; label: string }[] = [
    { code: 1, label: "Wrong winner reported" },
    { code: 2, label: "Score / result mismatch" },
    { code: 3, label: "Match not played / no-show" },
    { code: 0, label: "Other" },
];

// ── Countdown formatting ──────────────────────────────────────────────────────

function formatRemaining(ms: number): string {
    if (ms <= 0) return "0:00";
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// Self-contained dispute-window countdown. Owns its own 1s clock so only this
// leaf re-renders each second — not the entire ReportResultModal. The interval
// is gated on a live deadline, so it stays idle when there's no open window.
function DisputeCountdown({
    deadlineMs,
    tone,
}: {
    deadlineMs: number | null;
    tone: "amber" | "red";
}) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (deadlineMs === null) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [deadlineMs]);

    if (deadlineMs === null) return null;
    const remainingMs = deadlineMs - now;
    const color = tone === "red" ? "#f05a5a" : "#f5a623";
    const bg = tone === "red" ? "rgba(240,90,90,0.07)" : "rgba(245,166,35,0.07)";
    const border = tone === "red" ? "rgba(240,90,90,0.2)" : "rgba(245,166,35,0.2)";
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 12px" }}>
            <Clock style={{ width: 14, height: 14, color, flexShrink: 0 }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.74rem", color }}>
                {remainingMs > 0
                    ? <>Window: <strong>{formatRemaining(remainingMs)}</strong> remaining</>
                    : <>Window elapsed — may be finalized permissionlessly.</>}
            </span>
        </div>
    );
}

// ── Confirmation-race settle check ───────────────────────────────────────────
//
// Anchor's `.rpc()` throws on slow WS confirmation even when the tx landed.
// After an error, refetch on-chain state: if the action was actually applied,
// treat as success — no scary red toast for a tx that succeeded.

async function didActionSettle(
    sdk: BracketChainClient,
    tournamentPda: Address,
    onChainRound: number,
    onChainMatchIndex: number,
    isFinal: boolean,
): Promise<boolean> {
    try {
        const fresh = await getTournamentState(sdk, tournamentPda);
        if (isFinal) {
            return fresh.tournament.status === TournamentStatus.Completed;
        }
        return fresh.bracket.some((b) => {
            const acc = b.account;
            return (
                acc.round === onChainRound &&
                acc.matchIndex === onChainMatchIndex &&
                acc.status === MatchStatus.Completed
            );
        });
    } catch {
        return false;
    }
}

// ── Actionability predicate ──────────────────────────────────────────────────
//
// Single source of truth for "does opening the modal give this viewer an
// action?" — mirrors the renderActions() branches below. Used by BracketView
// to decide whether a click opens the action dispatcher (vs the read-only
// match modal) and by ManageView to list the organizer's actionable matches.
// Keep in lockstep with renderActions().
export function matchActionable(
    match: Match,
    view: TournamentView,
    viewer: string | null,
): boolean {
    if (match.status === "completed") return false;

    const isOrganizer = viewer !== null && viewer === view.organizer.address;
    const isArbiter =
        viewer !== null && viewer === (view.arbitrator ?? view.organizer.address);
    const isParticipant =
        viewer !== null &&
        (viewer === match.playerA?.address || viewer === match.playerB?.address);
    const s = match.settlement;
    const viewerIsProposer = viewer !== null && viewer === s.proposer;
    const deadlinePassed =
        s.claimDeadline !== null && Date.now() >= Date.parse(s.claimDeadline);
    // Multi-placement finals can't be claimed/confirmed permissionlessly (H-1)
    // — past the window only the arbitrator can act (settle_final).
    const needsArbiterSettle =
        isFinalMatch(match, view.matches) &&
        derivePreset(view.payouts.length) !== "wta";
    const postDeadlineActionable =
        deadlinePassed && (!needsArbiterSettle || isArbiter);

    switch (view.settlementMode) {
        case "organizer_only":
            return isOrganizer && match.status === "in_progress" && view.bracketReady;
        case "oracle": {
            if (match.status === "in_progress" && view.bracketReady && isOrganizer) {
                // Commit/bind ceremony — organizer-actionable until both steps done.
                const committed = match.oracle.lobbyId !== null;
                const bound = match.oracle.switchboardFeed !== null;
                return !committed || !bound;
            }
            if (match.status === "pending_confirmation")
                return isParticipant || postDeadlineActionable;
            if (match.status === "disputed") return isOrganizer || deadlinePassed;
            return false;
        }
        case "player_reported":
            if (match.status === "in_progress") return isParticipant;
            if (match.status === "pending_confirmation")
                return (isParticipant && !viewerIsProposer) || postDeadlineActionable;
            if (match.status === "disputed") return isOrganizer || deadlinePassed;
            return false;
        default:
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
    const { address: viewer } = useActiveWallet();
    const { fire } = useConfetti();

    // Selections shared by the propose (player) and resolve (organizer) panels.
    const [winner, setWinner] = useState<Player | null>(null);
    const [thirdPlace, setThirdPlace] = useState<Player | null>(null);
    const [disputeReason, setDisputeReason] = useState<number>(1);
    const [submitting, setSubmitting] = useState(false);

    // ── Roles ───────────────────────────────────────────────────────────────
    const isOrganizer = viewer !== null && viewer === tournament.organizer.address;
    // `settle_final` is signed by `tournament.arbitrator` — defaults to the
    // organizer at create-time (Squads reassignment is V1.3).
    const isArbiter =
        viewer !== null &&
        viewer === (tournament.arbitrator ?? tournament.organizer.address);
    const isPlayerA = viewer !== null && viewer === match.playerA?.address;
    const isPlayerB = viewer !== null && viewer === match.playerB?.address;
    const isParticipant = isPlayerA || isPlayerB;

    // ── Settlement envelope ─────────────────────────────────────────────────
    const s = match.settlement;
    const proposedWinnerPlayer = useMemo(
        () =>
            [match.playerA, match.playerB].find(
                (p) => p !== null && p.address === s.proposedWinner,
            ) ?? null,
        [match.playerA, match.playerB, s.proposedWinner],
    );
    const viewerIsProposer = viewer !== null && viewer === s.proposer;
    const deadlineMs = s.claimDeadline ? Date.parse(s.claimDeadline) : null;
    // Flip once when the dispute window elapses (one-shot setTimeout), instead
    // of re-rendering the whole modal every second. The live per-second tick
    // now lives only inside <DisputeCountdown>, the small leaf that needs it.
    const reachedDeadline = useDeadlineReached(deadlineMs ?? Number.NaN);
    const deadlinePassed = deadlineMs !== null && reachedDeadline;

    // ── Final-match placement context ───────────────────────────────────────
    const isFinal = useMemo(
        () => isFinalMatch(match, tournament.matches),
        [match, tournament.matches],
    );
    const preset = useMemo(
        () => derivePreset(tournament.payouts.length),
        [tournament.payouts.length],
    );
    const sfLosers = useMemo(
        () => (isFinal ? semifinalLosers(tournament.matches) : []),
        [isFinal, tournament.matches],
    );
    const qfLosers = useMemo(
        () => (isFinal && preset === "deep" ? quarterfinalLosers(tournament.matches) : []),
        [isFinal, preset, tournament.matches],
    );
    // Non-WTA finals need a placements array on finalization. Position 3 (and
    // 5–8 for Deep) is human-adjudicated — picked here by whoever finalizes.
    const finalNeedsPlacements = isFinal && preset !== "wta";

    const onChainRound = match.round - 1; // UI is 1-indexed; on-chain 0-indexed

    // Build the placements array for a known winner. Mirrors the program's
    // distribute_prizes ordering: [winner, runnerUp, third, ...qfLosers].
    // Returns [] when incomplete OR when any wallet repeats — the program
    // rejects duplicated placements (M-2 `DuplicatePlacement`), so we refuse
    // to build an array that would revert on-chain.
    function buildPlacements(winnerPlayer: Player | null): Address[] {
        if (!winnerPlayer) return [];
        const winnerAddr = address(winnerPlayer.address);
        const runnerUp = loserOf(match, winnerPlayer);
        if (!runnerUp) return [];
        const runnerUpAddr = address(runnerUp.address);

        let placements: Address[];
        if (preset === "wta") {
            placements = [winnerAddr];
        } else if (preset === "standard") {
            if (!thirdPlace) return [];
            placements = [winnerAddr, runnerUpAddr, address(thirdPlace.address)];
        } else {
            // deep
            if (!thirdPlace || qfLosers.length !== 4) return [];
            placements = [
                winnerAddr,
                runnerUpAddr,
                address(thirdPlace.address),
                ...qfLosers.map((p) => address(p.address)),
            ];
        }
        if (new Set(placements).size !== placements.length) return [];
        return placements;
    }

    // Can the configured placement picker produce a valid array for `w`?
    function placementsReady(w: Player | null): boolean {
        if (!finalNeedsPlacements) return true;
        return buildPlacements(w).length > 0;
    }

    // ── Action runners ──────────────────────────────────────────────────────

    function fireFinalize(final: boolean, label: string) {
        if (final) {
            toast.success("Champion crowned! Prize pool distributed on-chain.");
            fire();
        } else {
            toast.success(label);
        }
    }

    // Wrapper for finalizing actions (confirm / claim / resolve / forceClaim /
    // organizer-report) — handles submitting state, the confirmation-race
    // re-check, and success/error toasts.
    async function runFinalize(
        fn: () => Promise<{ isFinal: boolean }>,
        successLabel: string,
    ) {
        if (!sdk) {
            toast.error("Connect your wallet to continue");
            return;
        }
        setSubmitting(true);
        try {
            const result = await fn();
            fireFinalize(result.isFinal, successLabel);
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const text = (err as Error)?.message?.toLowerCase() ?? "";
            if (text.includes("rejected")) {
                toast.info("Request cancelled");
                return;
            }
            const settled = await didActionSettle(sdk, address(tournament.id), onChainRound, match.position, isFinal);
            if (settled) {
                fireFinalize(isFinal, successLabel);
                onSuccess();
                onClose();
                return;
            }
            handleTxError(err, "finalize");
        } finally {
            setSubmitting(false);
        }
    }

    // Wrapper for non-finalizing actions (propose / dispute) — these never
    // settle the match, so there's no confirmation-race re-check.
    async function runSimple(fn: () => Promise<unknown>, successLabel: string) {
        if (!sdk) {
            toast.error("Connect your wallet to continue");
            return;
        }
        setSubmitting(true);
        try {
            await fn();
            toast.success(successLabel);
            onSuccess();
            onClose();
        } catch (err: unknown) {
            handleTxError(err, "settlement");
        } finally {
            setSubmitting(false);
        }
    }

    const pda = address(tournament.id);

    function handleOrganizerReport() {
        if (!winner) return;
        const placements = isFinal ? buildPlacements(winner) : undefined;
        if (isFinal && (!placements || placements.length === 0)) {
            toast.error("Could not derive placements — bracket data incomplete.");
            return;
        }
        void runFinalize(
            () =>
                reportResult(sdk!, {
                    tournamentPda: pda,
                    round: onChainRound,
                    matchIndex: match.position,
                    winner: address(winner.address),
                    placements,
                }),
            `Round ${match.round} match reported.`,
        );
    }

    function handlePropose() {
        if (!winner) return;
        void runSimple(
            () =>
                proposeResult(sdk!, {
                    tournamentPda: pda,
                    round: onChainRound,
                    matchIndex: match.position,
                    proposedWinner: address(winner.address),
                }),
            "Result proposed — opponent has the dispute window to confirm or dispute.",
        );
    }

    function handleConfirm() {
        const placements = finalNeedsPlacements ? buildPlacements(proposedWinnerPlayer) : undefined;
        void runFinalize(
            () =>
                confirmResult(sdk!, {
                    tournamentPda: pda,
                    round: onChainRound,
                    matchIndex: match.position,
                    placements,
                }),
            `Round ${match.round} result confirmed.`,
        );
    }

    function handleDispute() {
        void runSimple(
            () =>
                disputeResult(sdk!, {
                    tournamentPda: pda,
                    round: onChainRound,
                    matchIndex: match.position,
                    disputeReason,
                }),
            "Dispute filed — the organizer has been asked to resolve.",
        );
    }

    function handleClaim() {
        const placements = finalNeedsPlacements ? buildPlacements(proposedWinnerPlayer) : undefined;
        void runFinalize(
            () =>
                claimResult(sdk!, {
                    tournamentPda: pda,
                    round: onChainRound,
                    matchIndex: match.position,
                    placements,
                }),
            `Round ${match.round} result claimed.`,
        );
    }

    // Arbitrator-signed settlement of an undisputed multi-placement final
    // (H-1). The winner stays pinned to the trustless `proposedWinner`; the
    // arbitrator only adjudicates 3rd place (+ Deep 5th–8th).
    function handleSettle() {
        const placements = buildPlacements(proposedWinnerPlayer);
        if (placements.length === 0) {
            toast.error("Pick 3rd place to settle the final standings.");
            return;
        }
        void runFinalize(
            () =>
                settleFinal(sdk!, {
                    tournamentPda: pda,
                    round: onChainRound,
                    matchIndex: match.position,
                    placements,
                }),
            "Final settled.",
        );
    }

    function handleResolve() {
        if (!winner) return;
        const placements = finalNeedsPlacements ? buildPlacements(winner) : undefined;
        if (finalNeedsPlacements && (!placements || placements.length === 0)) {
            toast.error("Pick the final standings before resolving.");
            return;
        }
        void runFinalize(
            () =>
                resolveDispute(sdk!, {
                    tournamentPda: pda,
                    round: onChainRound,
                    matchIndex: match.position,
                    winner: address(winner.address),
                    placements,
                }),
            `Dispute resolved for Round ${match.round}.`,
        );
    }

    function handleForceClaim() {
        const placements = finalNeedsPlacements ? buildPlacements(proposedWinnerPlayer) : undefined;
        void runFinalize(
            () =>
                forceClaimDisputed(sdk!, {
                    tournamentPda: pda,
                    round: onChainRound,
                    matchIndex: match.position,
                    placements,
                }),
            `Disputed match force-claimed for the proposed winner.`,
        );
    }

    // ── Styling helpers ───────────────────────────────────────────────────────
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

    // ── Reusable fragments ──────────────────────────────────────────────────

    function WinnerPicker() {
        return (
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
        );
    }

    // Placement picker for non-WTA finals (3rd place + Deep 5–8 auto-derived).
    function PlacementPicker() {
        if (!finalNeedsPlacements) return null;
        return (
            <>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={sectionLabel}>3rd Place</label>
                    {sfLosers.length === 0 ? (
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "rgba(245,166,35,0.7)", background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.2)", padding: "10px 12px", borderRadius: 8, lineHeight: 1.5 }}>
                            Waiting for semifinal results — both SF matches must be finalized before the final can be settled.
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
                        Pick one of the two semifinal losers. Position 3 is human-adjudicated on-chain.
                    </p>
                </div>
                {preset === "deep" && (
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
            </>
        );
    }

    function ProposedSummary() {
        return (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "rgba(240,241,245,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Proposed Winner</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9rem", color: "#22d47e" }}>{proposedWinnerPlayer?.display ?? s.proposedWinner ?? "—"}</p>
            </div>
        );
    }

    function InfoBox({ icon, title, body, tone = "neutral" }: { icon: React.ReactNode; title: string; body: string; tone?: "neutral" | "amber" | "red" }) {
        const color = tone === "red" ? "#f05a5a" : tone === "amber" ? "#f5a623" : "rgba(240,241,245,0.85)";
        const bg = tone === "red" ? "rgba(240,90,90,0.07)" : tone === "amber" ? "rgba(245,166,35,0.07)" : "rgba(255,255,255,0.03)";
        const border = tone === "red" ? "rgba(240,90,90,0.2)" : tone === "amber" ? "rgba(245,166,35,0.2)" : "rgba(255,255,255,0.08)";
        return (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "12px 14px" }}>
                <span style={{ flexShrink: 0, marginTop: 1, color }}>{icon}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.82rem", color }}>{title}</p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "rgba(240,241,245,0.6)", lineHeight: 1.5 }}>{body}</p>
                </div>
            </div>
        );
    }

    // ── Panel selection ───────────────────────────────────────────────────────
    // Returns the body fragment + footer action button(s) for the current
    // (settlementMode × viewer-role × match-state). Each branch is mutually
    // exclusive; the dispatcher walks from terminal → mode-specific states.

    const headerTitle = isFinal
        ? "Final Result"
        : `Round ${match.round}, Match ${match.position + 1}`;

    function renderBody(): React.ReactNode {
        // Terminal.
        if (match.status === "completed") {
            return <InfoBox icon={<Trophy style={{ width: 16, height: 16 }} />} title="Match settled" body="This result is finalized on-chain and cannot be changed." />;
        }

        // ── Organizer-only mode ────────────────────────────────────────────
        if (tournament.settlementMode === "organizer_only") {
            if (!isOrganizer) {
                return <InfoBox icon={<ShieldAlert style={{ width: 16, height: 16 }} />} title="Organizer reports results" body="This tournament settles results organizer-only. Only the organizer can report match outcomes." />;
            }
            if (!tournament.bracketReady) {
                return <InfoBox icon={<Clock style={{ width: 16, height: 16 }} />} title="Bracket not ready" body="The on-chain bracket is still initializing. Reporting unlocks once all match accounts exist." tone="amber" />;
            }
            return (
                <>
                    <WinnerPicker />
                    <PlacementPicker />
                    {isFinal && <FinalPayoutSummary />}
                    <FinalityWarning />
                </>
            );
        }

        // ── Oracle mode (Stage C / V1.2) ────────────────────────────────────
        if (tournament.settlementMode === "oracle") {
            const committed = match.oracle.lobbyId !== null;
            const bound = match.oracle.switchboardFeed !== null;
            const ready = committed && bound;

            // Active match, no live proposal — commit/bind ceremony OR awaiting
            // the relayer once the ceremony is done.
            if (match.status === "in_progress") {
                if (!tournament.bracketReady) {
                    return <InfoBox icon={<Clock style={{ width: 16, height: 16 }} />} title="Bracket not ready" body="The on-chain bracket is still initializing. Commit unlocks once all match accounts exist." tone="amber" />;
                }
                if (!ready && isOrganizer) {
                    return <CommitAndBindPanel tournament={tournament} match={match} onSuccess={onSuccess} />;
                }
                if (!ready) {
                    return <InfoBox icon={<Clock style={{ width: 16, height: 16 }} />} title="Oracle setup in progress" body="The organizer is committing the match to the oracle feed. The result will be reported automatically once the feed resolves." tone="amber" />;
                }
                return <OraclePendingPanel tournament={tournament} match={match} />;
            }

            // Live oracle proposal — either player may dispute, and the
            // arbitrator (defaults to organizer) joins the resolve path. The
            // proposer is the relayer wallet, so the existing `viewerIsProposer`
            // gate naturally lets both players act.
            if (match.status === "pending_confirmation") {
                if (isParticipant) {
                    return (
                        <>
                            <InfoBox icon={<Radio style={{ width: 16, height: 16 }} />} title="Oracle proposed a winner" body="The Switchboard feed has reported the match result. Either player may dispute it; if the window closes undisputed, the result is permissionlessly claimed." tone="amber" />
                            <ProposedSummary />
                            <DisputeCountdown deadlineMs={deadlineMs} tone="amber" />
                            {deadlinePassed && finalNeedsPlacements && isArbiter && <PlacementPicker />}
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <label style={sectionLabel}>If you dispute — reason</label>
                                <select
                                    value={disputeReason}
                                    disabled={submitting}
                                    onChange={(e) => setDisputeReason(Number(e.target.value))}
                                    style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: "rgba(240,241,245,0.85)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 12px" }}
                                >
                                    {DISPUTE_REASONS.map((r) => (
                                        <option key={r.code} value={r.code} style={{ background: "#0d0f18" }}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    );
                }
                return (
                    <>
                        <ProposedSummary />
                        <DisputeCountdown deadlineMs={deadlineMs} tone="amber" />
                        {deadlinePassed
                            ? finalNeedsPlacements
                                ? isArbiter
                                    ? <InfoBox icon={<Gavel style={{ width: 16, height: 16 }} />} title="Settle the final" body="The dispute window elapsed undisputed. As arbitrator, set the remaining standings to distribute the prize pool — the winner stays pinned to the oracle proposal." />
                                    : <InfoBox icon={<Gavel style={{ width: 16, height: 16 }} />} title="Awaiting arbitrator settlement" body="The window elapsed undisputed. This final pays multiple placements, so the arbitrator settles the standings (the winner is already pinned to the oracle proposal)." tone="amber" />
                                : <InfoBox icon={<Trophy style={{ width: 16, height: 16 }} />} title="Dispute window elapsed" body="No dispute was filed. Anyone may now claim this result to finalize the match on-chain." />
                            : <InfoBox icon={<Radio style={{ width: 16, height: 16 }} />} title="Oracle proposed a winner" body="Awaiting either player's dispute or window close." tone="amber" />}
                        {deadlinePassed && finalNeedsPlacements && isArbiter && <PlacementPicker />}
                    </>
                );
            }

            // Disputed: arbitrator (= organizer in V1.2) resolves.
            if (match.status === "disputed") {
                if (isOrganizer) {
                    return (
                        <>
                            <InfoBox icon={<Gavel style={{ width: 16, height: 16 }} />} title="Resolve disputed oracle result" body="An oracle result was disputed. As arbitrator you may set the final winner." tone="amber" />
                            <ProposedSummary />
                            <WinnerPicker />
                            <PlacementPicker />
                            <DisputeCountdown deadlineMs={deadlineMs} tone="red" />
                            <FinalityWarning />
                        </>
                    );
                }
                return (
                    <>
                        <ProposedSummary />
                        <DisputeCountdown deadlineMs={deadlineMs} tone="red" />
                        {deadlinePassed
                            ? <InfoBox icon={<ShieldAlert style={{ width: 16, height: 16 }} />} title="Arbitrator did not resolve" body="The 24h resolution window elapsed. Anyone may now force-claim the disputed match for its proposed winner." tone="red" />
                            : <InfoBox icon={<Gavel style={{ width: 16, height: 16 }} />} title="Awaiting arbitrator" body="This oracle proposal is disputed and waiting for the arbitrator to resolve it. If they stay silent past the window, it can be force-claimed." tone="amber" />}
                    </>
                );
            }

            return <InfoBox icon={<ShieldAlert style={{ width: 16, height: 16 }} />} title="Oracle-settled match" body="Results for this tournament are reported by an oracle." />;
        }

        // ── Player-reported mode ────────────────────────────────────────────
        // No proposal yet → a player reports.
        if (match.status === "in_progress") {
            if (isParticipant) {
                return (
                    <>
                        <InfoBox icon={<Trophy style={{ width: 16, height: 16 }} />} title="Report your result" body="Select the winner. Your opponent then has the dispute window to confirm or dispute before the result can be claimed." />
                        <WinnerPicker />
                        <FinalityWarning proposal />
                    </>
                );
            }
            return <InfoBox icon={<Clock style={{ width: 16, height: 16 }} />} title="Awaiting player report" body="Neither player has reported this match yet. The result is reported by the two players." tone="amber" />;
        }

        // Proposal live, not disputed.
        if (match.status === "pending_confirmation") {
            // Opponent (the player who did NOT propose) confirms or disputes.
            // On a multi-placement final, confirm is NOT available — the program
            // limits counterparty finalization to WinnerTakesAll (H-1); after
            // the window the arbitrator settles via settle_final instead.
            if (isParticipant && !viewerIsProposer) {
                return (
                    <>
                        <ProposedSummary />
                        <DisputeCountdown deadlineMs={deadlineMs} tone="amber" />
                        {finalNeedsPlacements && (
                            <InfoBox
                                icon={<Gavel style={{ width: 16, height: 16 }} />}
                                title="Final settles via the arbitrator"
                                body="This final pays multiple placements, so it can't be confirmed directly. If you don't dispute before the window closes, the arbitrator settles the standings with this winner."
                                tone="amber"
                            />
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <label style={sectionLabel}>If you dispute — reason</label>
                            <select
                                value={disputeReason}
                                disabled={submitting}
                                onChange={(e) => setDisputeReason(Number(e.target.value))}
                                style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: "rgba(240,241,245,0.85)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 12px" }}
                            >
                                {DISPUTE_REASONS.map((r) => (
                                    <option key={r.code} value={r.code} style={{ background: "#0d0f18" }}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                    </>
                );
            }
            // Proposer / spectator: waiting. Past deadline → permissionless
            // claim (WTA / non-final) or arbitrator settle (multi-placement final).
            return (
                <>
                    <ProposedSummary />
                    <DisputeCountdown deadlineMs={deadlineMs} tone="amber" />
                    {deadlinePassed
                        ? finalNeedsPlacements
                            ? isArbiter
                                ? <InfoBox icon={<Gavel style={{ width: 16, height: 16 }} />} title="Settle the final" body="The dispute window elapsed undisputed. As arbitrator, set the remaining standings to distribute the prize pool — the winner stays pinned to the proposal." />
                                : <InfoBox icon={<Gavel style={{ width: 16, height: 16 }} />} title="Awaiting arbitrator settlement" body="The window elapsed undisputed. This final pays multiple placements, so the arbitrator settles the standings (the winner is already pinned to the proposal)." tone="amber" />
                            : <InfoBox icon={<Trophy style={{ width: 16, height: 16 }} />} title="Dispute window elapsed" body="No dispute was filed. Anyone may now claim this result to finalize the match on-chain." />
                        : <InfoBox icon={<Clock style={{ width: 16, height: 16 }} />} title="Awaiting opponent" body={viewerIsProposer ? "You proposed this result. Your opponent can confirm or dispute until the window closes; after that it can be claimed." : "A result is proposed. The opponent can confirm or dispute until the window closes."} tone="amber" />}
                    {deadlinePassed && finalNeedsPlacements && isArbiter && <PlacementPicker />}
                </>
            );
        }

        // Disputed.
        if (match.status === "disputed") {
            if (isOrganizer) {
                return (
                    <>
                        <InfoBox icon={<Gavel style={{ width: 16, height: 16 }} />} title="Resolve dispute" body="This result was disputed. As organizer (arbitrator) choose the correct winner to finalize the match." tone="amber" />
                        <ProposedSummary />
                        <WinnerPicker />
                        <PlacementPicker />
                        <DisputeCountdown deadlineMs={deadlineMs} tone="red" />
                        <FinalityWarning />
                    </>
                );
            }
            return (
                <>
                    <ProposedSummary />
                    <DisputeCountdown deadlineMs={deadlineMs} tone="red" />
                    {deadlinePassed
                        ? <InfoBox icon={<ShieldAlert style={{ width: 16, height: 16 }} />} title="Organizer did not resolve" body="The 24h resolution window elapsed. Anyone may now force-claim the disputed match for its proposed winner." tone="red" />
                        : <InfoBox icon={<Gavel style={{ width: 16, height: 16 }} />} title="Awaiting organizer" body="This match is disputed and waiting for the organizer to resolve it. If they stay silent past the window, it can be force-claimed." tone="amber" />}
                    {deadlinePassed && finalNeedsPlacements && <PlacementPicker />}
                </>
            );
        }

        return <InfoBox icon={<Clock style={{ width: 16, height: 16 }} />} title="Nothing to do" body="There are no available actions for this match right now." />;
    }

    function FinalPayoutSummary() {
        return (
            <div style={{ background: "rgba(34,212,126,0.05)", border: "1px solid rgba(34,212,126,0.12)", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", fontWeight: 500, color: "rgba(34,212,126,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>On Settle</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "rgba(240,241,245,0.55)", lineHeight: 1.5 }}>
                    Prize pool of <span style={{ fontWeight: 700, color: "#22d47e" }}>{tournament.prizePool} {tournament.token}</span> will be distributed on-chain in a single transaction (3.5% fee to protocol).
                </p>
            </div>
        );
    }

    function FinalityWarning({ proposal = false }: { proposal?: boolean }) {
        return (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 8, padding: "10px 12px" }}>
                <AlertTriangle style={{ width: 16, height: 16, color: "#f5a623", flexShrink: 0, marginTop: 1 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: "#f5a623" }}>
                        {proposal ? "Proposal opens the dispute window" : "This action is final"}
                    </p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "rgba(245,166,35,0.7)", lineHeight: 1.5 }}>
                        {proposal
                            ? "Once signed, your opponent is asked to confirm or dispute. You cannot change the proposed winner."
                            : isFinal
                                ? "Once signed, prize payouts are distributed on-chain and cannot be reversed."
                                : "Once signed, the winner advances on-chain and cannot be changed."}
                    </p>
                </div>
            </div>
        );
    }

    // ── Footer actions ──────────────────────────────────────────────────────
    // Mirror the panel branches: returns the primary action button (or null
    // when the panel is informational-only).

    function renderActions(): React.ReactNode {
        const busy = (label: string, idle: string) =>
            submitting ? <><Loader2 className="animate-spin size-[15px]" />{label}</> : idle;

        if (match.status === "completed") return null;

        if (tournament.settlementMode === "organizer_only") {
            if (!isOrganizer || !tournament.bracketReady) return null;
            const ready = winner !== null && placementsReady(winner);
            return (
                <Button variant="primary" className="flex-1" onClick={handleOrganizerReport} disabled={!ready || submitting}>
                    {busy(isFinal ? "Distributing…" : "Reporting…", isFinal ? "Confirm & Distribute" : "Confirm Winner")}
                </Button>
            );
        }

        if (tournament.settlementMode === "oracle") {
            // in_progress: the CommitAndBindPanel ships its own buttons; the
            // OraclePendingPanel is informational. No footer action.
            if (match.status === "in_progress") return null;

            // Oracle proposal live — either player may dispute. Once the
            // window passes: anyone claims (WTA / non-final), or the
            // arbitrator settles (multi-placement final, H-1).
            if (match.status === "pending_confirmation") {
                const settleAction = (() => {
                    if (!deadlinePassed) return null;
                    if (finalNeedsPlacements) {
                        if (!isArbiter) return null;
                        const settleReady = placementsReady(proposedWinnerPlayer);
                        return (
                            <Button variant="primary" className="flex-1" onClick={handleSettle} disabled={!settleReady || submitting}>
                                {busy("Settling…", "Settle Final")}
                            </Button>
                        );
                    }
                    return (
                        <Button variant="primary" className="flex-1" onClick={handleClaim} disabled={submitting}>
                            {busy("Claiming…", "Claim Result")}
                        </Button>
                    );
                })();
                if (isParticipant) {
                    return (
                        <>
                            <Button variant="outline" className="flex-1" onClick={handleDispute} disabled={submitting}>
                                {submitting ? <Loader2 className="animate-spin size-[15px]" /> : "Dispute"}
                            </Button>
                            {settleAction}
                        </>
                    );
                }
                return settleAction;
            }

            // Disputed: arbitrator resolves; anyone force-claims past window.
            if (match.status === "disputed") {
                if (isOrganizer) {
                    const ready = winner !== null && placementsReady(winner);
                    return (
                        <Button variant="primary" className="flex-1" onClick={handleResolve} disabled={!ready || submitting}>
                            {busy("Resolving…", "Resolve Dispute")}
                        </Button>
                    );
                }
                if (deadlinePassed) {
                    const fcReady = placementsReady(proposedWinnerPlayer);
                    return (
                        <Button variant="primary" className="flex-1" onClick={handleForceClaim} disabled={!fcReady || submitting}>
                            {busy("Finalizing…", "Force-Claim")}
                        </Button>
                    );
                }
                return null;
            }
            return null;
        }

        // player_reported
        if (match.status === "in_progress") {
            if (!isParticipant) return null;
            return (
                <Button variant="primary" className="flex-1" onClick={handlePropose} disabled={winner === null || submitting}>
                    {busy("Proposing…", "Propose Result")}
                </Button>
            );
        }

        if (match.status === "pending_confirmation") {
            if (isParticipant && !viewerIsProposer) {
                // Multi-placement final: counterparty confirm is rejected
                // on-chain (H-1) — only Dispute is offered; the arbitrator
                // settles after the window.
                if (finalNeedsPlacements) {
                    return (
                        <Button variant="outline" className="flex-1" onClick={handleDispute} disabled={submitting}>
                            {submitting ? <Loader2 className="animate-spin size-[15px]" /> : "Dispute"}
                        </Button>
                    );
                }
                return (
                    <>
                        <Button variant="outline" className="flex-1" onClick={handleDispute} disabled={submitting}>
                            {submitting ? <Loader2 className="animate-spin size-[15px]" /> : "Dispute"}
                        </Button>
                        <Button variant="primary" className="flex-1" onClick={handleConfirm} disabled={submitting}>
                            {busy("Confirming…", "Confirm")}
                        </Button>
                    </>
                );
            }
            if (deadlinePassed) {
                // Multi-placement final → arbitrator-signed settle_final;
                // everything else → permissionless claim_result.
                if (finalNeedsPlacements) {
                    if (!isArbiter) return null;
                    const settleReady = placementsReady(proposedWinnerPlayer);
                    return (
                        <Button variant="primary" className="flex-1" onClick={handleSettle} disabled={!settleReady || submitting}>
                            {busy("Settling…", "Settle Final")}
                        </Button>
                    );
                }
                return (
                    <Button variant="primary" className="flex-1" onClick={handleClaim} disabled={submitting}>
                        {busy("Claiming…", "Claim Result")}
                    </Button>
                );
            }
            return null;
        }

        if (match.status === "disputed") {
            if (isOrganizer) {
                const ready = winner !== null && placementsReady(winner);
                return (
                    <Button variant="primary" className="flex-1" onClick={handleResolve} disabled={!ready || submitting}>
                        {busy("Resolving…", "Resolve Dispute")}
                    </Button>
                );
            }
            if (deadlinePassed) {
                const fcReady = placementsReady(proposedWinnerPlayer);
                return (
                    <Button variant="primary" className="flex-1" onClick={handleForceClaim} disabled={!fcReady || submitting}>
                        {busy("Finalizing…", "Force-Claim")}
                    </Button>
                );
            }
            return null;
        }

        return null;
    }

    const actions = renderActions();

    return (
        <Modal open={true} onClose={onClose} maxWidth={440}>
            <Modal.Header onClose={onClose}>
                <Trophy style={{ width: 16, height: 16, color: "#22d47e" }} />
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#f0f1f5" }}>
                    {headerTitle}
                </h3>
            </Modal.Header>

            {renderBody()}

            <Modal.Actions>
                <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
                    {actions ? "Cancel" : "Close"}
                </Button>
                {actions}
            </Modal.Actions>
        </Modal>
    );
}
