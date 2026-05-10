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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-5 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-purple-600" />
                        <h3 className="font-bold text-gray-900">
                            {isFinal ? "Report Final Result" : `Report — Round ${match.round}, Match ${match.position + 1}`}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Winner picker */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Winner
                    </label>
                    {[match.playerA, match.playerB].map((p) => (
                        <button
                            key={p?.address ?? "tbd"}
                            disabled={!p || submitting}
                            onClick={() => p && setWinner(p)}
                            className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                                winner?.address === p?.address
                                    ? "border-purple-500 bg-purple-50"
                                    : "border-gray-200 hover:border-gray-300"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <span className="text-sm font-mono text-gray-700">
                                {p?.display ?? "TBD"}
                            </span>
                            {winner?.address === p?.address && (
                                <span className="text-xs font-semibold text-purple-600">Selected</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Final-match placement controls */}
                {needsThird && (
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            3rd Place
                        </label>
                        {sfLosers.length === 0 ? (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                                Waiting for semifinal results — both SF matches must be reported
                                before the final can be finalized.
                            </p>
                        ) : (
                            sfLosers.map((p) => (
                                <button
                                    key={p.address}
                                    disabled={submitting}
                                    onClick={() => setThirdPlace(p)}
                                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg border-2 text-left transition-colors ${
                                        thirdPlace?.address === p.address
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    } disabled:opacity-50`}
                                >
                                    <span className="text-sm font-mono text-gray-700">{p.display}</span>
                                    {thirdPlace?.address === p.address && (
                                        <span className="text-xs font-semibold text-blue-600">3rd</span>
                                    )}
                                </button>
                            ))
                        )}
                        <p className="text-[10px] text-gray-500 italic">
                            Pick one of the two semifinal losers. Position 3 is organizer-trusted on-chain (MVP).
                        </p>
                    </div>
                )}

                {/* Deep preset: 5-8 auto-derived */}
                {isFinal && preset === "deep" && (
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            5th–8th (auto: quarterfinal losers)
                        </label>
                        {qfLosers.length !== 4 ? (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                                Need 4 completed quarterfinals — found {qfLosers.length}.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {qfLosers.map((p) => (
                                    <span
                                        key={p.address}
                                        className="text-[11px] font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded"
                                    >
                                        {p.display}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Final payout summary */}
                {isFinal && (
                    <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-1.5">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                            On Confirm
                        </p>
                        <p className="text-xs text-gray-700 leading-relaxed">
                            Prize pool of <span className="font-bold">{tournament.prizePool} {tournament.token}</span> will
                            be distributed on-chain in a single transaction (3.5% fee to protocol).
                        </p>
                    </div>
                )}

                {/* Irreversibility warning — applies to both final and non-final
                    matches. The program writes match results to a Match PDA and
                    has no instruction to amend or rewind, so once confirmed the
                    bracket cannot be edited from the UI. */}
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-semibold text-amber-800">
                            Reporting is final
                        </p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            {isFinal
                                ? "Once signed, prize payouts are distributed on-chain and cannot be reversed."
                                : "Once signed, the winner advances on-chain. Scores cannot be changed."}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitting}
                        className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {isFinal ? "Distributing…" : "Reporting…"}
                            </span>
                        ) : isFinal ? (
                            "Confirm & Distribute"
                        ) : (
                            "Confirm Winner"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
