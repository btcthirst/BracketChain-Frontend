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
    /** All matches in the tournament — needed to determine if this is the final. */
    allMatches: Match[];
    /** Full participant list — needed to build placements[] for the final match. */
    participants: Player[];
    onClose: () => void;
    onSuccess: () => void;
}

export function ReportResultModal({
    match,
    tournamentId,
    allMatches,
    participants,
    onClose,
    onSuccess,
}: Props) {
    const sdk = useBracketChainClient();
    const [winnerId, setWinnerId] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const players = [match.playerA, match.playerB].filter(Boolean) as Player[];

    // The final match is the one with the highest round number AND there is
    // exactly 1 match in that round (single-elim finals).
    const maxRound = Math.max(...allMatches.map(m => m.round));
    const isFinal =
        match.round === maxRound &&
        allMatches.filter(m => m.round === maxRound).length === 1;

    /**
     * Build placements array required by the program when reporting the final.
     * Position 0 = winner (champion), position 1 = loser of the final.
     * Remaining positions are derived from participants not in the final
     * (organizer-trusted in MVP) sorted by deepest round reached descending.
     */
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
                        .filter(
                            m =>
                                m.playerA?.address === p.address ||
                                m.playerB?.address === p.address,
                        )
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
                // match.round is 1-indexed in the UI; the SDK expects 0-indexed
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-5 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                        <h3 className="font-bold text-gray-900">Report Result</h3>
                        {isFinal && (
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full w-fit">
                                Final Match — placements will be recorded
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} disabled={submitting} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Match info */}
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 flex justify-between">
                    <span>Round {match.round} — Match {match.position + 1}</span>
                    <span className="font-mono">
                        {match.playerA?.display ?? "TBD"} vs {match.playerB?.display ?? "TBD"}
                    </span>
                </div>

                {/* Winner selector */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">Select Winner</label>
                    <div className="flex flex-col gap-2">
                        {players.map(p => (
                            <button
                                key={p.address}
                                onClick={() => setWinnerId(p.address)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${winnerId === p.address
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                <div
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${winnerId === p.address ? "border-blue-500" : "border-gray-300"
                                        }`}
                                >
                                    {winnerId === p.address && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    )}
                                </div>
                                <span className="text-sm font-mono text-gray-700">{p.display}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">{error}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!winnerId || submitting}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Signing…</>
                        ) : (
                            "Confirm Result"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}