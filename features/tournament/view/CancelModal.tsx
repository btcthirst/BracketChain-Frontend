"use client";

import { useState } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { cancelTournament, mapError } from "@bracketchain/sdk";
import { toast } from "sonner";
import { useBracketChainClient } from "@/lib/sdk";

interface Props {
    tournamentId: string;
    tournamentName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function CancelModal({ tournamentId, tournamentName, onClose, onSuccess }: Props) {
    const sdk = useBracketChainClient();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleCancel() {
        if (!sdk) { setError("Wallet not connected."); return; }

        setSubmitting(true);
        setError("");

        try {
            const result = await cancelTournament(sdk, {
                tournamentPda: new PublicKey(tournamentId),
            });
            const { refundsSubmitted, txSignatures } = result;
            const txCount = txSignatures.length;
            const detail = refundsSubmitted === 0
                ? "Organizer deposit refunded."
                : `${refundsSubmitted} entry-fee refund${refundsSubmitted === 1 ? "" : "s"} + organizer deposit issued across ${txCount} tx${txCount === 1 ? "" : "s"}.`;
            toast.success(`Tournament cancelled. ${detail}`);
            onSuccess();
            onClose();
        } catch (err) {
            const msg = mapError(err).message;
            setError(msg);
            toast.error(`Cancellation failed. ${msg}`);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-5 p-6">

                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Cancel Tournament</h3>
                    <button onClick={onClose} disabled={submitting} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-amber-800">This action is irreversible</p>
                        <p className="text-xs text-amber-700">
                            Cancelling <span className="font-semibold">&quot;{tournamentName}&quot;</span> will
                            refund all entry fees to participants. The organizer deposit will also be returned.
                        </p>
                    </div>
                </div>

                {error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
                    >
                        Keep Tournament
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling…</>
                            : "Cancel & Refund"
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
