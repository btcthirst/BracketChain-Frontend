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

const STATUS_STYLES: Record<string, string> = {
    registration: "bg-green-100 text-green-700",
    in_progress: "bg-blue-100  text-blue-700",
    completed: "bg-gray-100  text-gray-600",
    cancelled: "bg-red-100   text-red-600",
};
const STATUS_LABELS: Record<string, string> = {
    registration: "Registration Open",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
};

export function ManageView({ tournamentId, onBack }: Props) {
    const { publicKey } = useWallet();
    const { state, refresh } = useTournamentView(tournamentId);
    const [reportMatch, setReportMatch] = useState<Match | null>(null);
    const [showCancel, setShowCancel] = useState(false);

    return (
        <div className="flex flex-col gap-6">

            {/* Sub-page top bar */}
            <div className="flex items-center gap-4 flex-wrap">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </button>

                {state.status === "success" && (
                    <>
                        <div className="h-4 w-px bg-gray-300" />
                        <h2 className="text-lg font-bold text-gray-900">{state.data.name}</h2>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[state.data.status] ?? ""}`}>
                            {STATUS_LABELS[state.data.status] ?? state.data.status}
                        </span>
                        <button
                            onClick={refresh}
                            className="ml-auto p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>

            {/* Loading */}
            {state.status === "loading" && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <BracketSkeleton />
                </div>
            )}

            {/* Error */}
            {state.status === "error" && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <AlertCircle className="w-8 h-8 text-gray-300" />
                    <p className="text-sm text-gray-500">Failed to load tournament data.</p>
                    <button onClick={refresh} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                        <RefreshCw className="w-4 h-4" /> Retry
                    </button>
                </div>
            )}

            {/* Not found */}
            {state.status === "not_found" && (
                <div className="py-16 text-center text-sm text-gray-400">Tournament not found.</div>
            )}

            {/* Success */}
            {state.status === "success" && (() => {
                const t = state.data;
                const hasBracket = t.matches.length > 0;
                const activeMatches = t.matches.filter(m => m.status === "in_progress");

                // 1. Only organizer can cancel
                // 2. Only if in registration OR in_progress but no matches played yet
                const isOrganizer = t.organizer.address === publicKey?.toBase58();
                const canCancel =
                    isOrganizer && (
                        t.status === "registration" ||
                        (t.status === "in_progress" && t.matches.every(m => m.status === "pending"))
                    );

                return (
                    <div className="flex flex-col gap-4">


                        {/* Bracket panel */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                                <h3 className="text-sm font-semibold text-gray-700">Bracket</h3>
                                <span className="text-xs text-gray-400">
                                    {t.participants.length}/{t.maxParticipants} participants
                                </span>
                            </div>
                            {!hasBracket
                                ? <BracketEmpty />
                                : <BracketView matches={t.matches} />
                            }
                        </div>

                        {/* Active matches — Report Result buttons */}
                        {activeMatches.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                <div className="border-b border-gray-100 px-5 py-3">
                                    <h3 className="text-sm font-semibold text-gray-700">
                                        Active Matches
                                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                            {activeMatches.length}
                                        </span>
                                    </h3>
                                </div>
                                <div className="flex flex-col divide-y divide-gray-100">
                                    {activeMatches.map(match => (
                                        <div key={match.id} className="flex items-center justify-between px-5 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-semibold text-gray-700">
                                                    Round {match.round} — Match {match.position + 1}
                                                </span>
                                                <span className="text-xs text-gray-400 font-mono">
                                                    {match.playerA?.display ?? "TBD"} vs {match.playerB?.display ?? "TBD"}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setReportMatch(match)}
                                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors"
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
                            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-sm font-semibold text-red-800">Cancel Tournament</p>
                                    <p className="text-xs text-red-600">
                                        All entry fees will be refunded. This cannot be undone.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowCancel(true)}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
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