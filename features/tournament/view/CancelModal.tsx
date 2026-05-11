"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { cancelTournament, mapError } from "@bracketchain/sdk";
import { toast } from "sonner";
import { useBracketChainClient } from "@/lib/sdk";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

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
        <Modal open={true} onClose={submitting ? () => { } : onClose}>
            <Modal.Header onClose={onClose} disabled={submitting}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#f0f1f5" }}>
                    Cancel Tournament
                </h3>
            </Modal.Header>

            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    background: "rgba(245,166,35,0.07)",
                    border: "1px solid rgba(245,166,35,0.2)",
                    borderRadius: 10,
                    padding: "12px 14px",
                }}
            >
                <AlertTriangle style={{ width: 18, height: 18, color: "#f5a623", flexShrink: 0, marginTop: 1 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "#f5a623" }}>
                        This action is irreversible
                    </p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "rgba(245,166,35,0.7)", lineHeight: 1.5 }}>
                        Cancelling <span style={{ fontWeight: 700 }}>&quot;{tournamentName}&quot;</span> will refund all entry fees to participants. The organizer deposit will also be returned.
                    </p>
                </div>
            </div>

            {error && (
                <p
                    style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.78rem",
                        color: "#f04e66",
                        background: "rgba(240,78,102,0.07)",
                        border: "1px solid rgba(240,78,102,0.2)",
                        borderRadius: 8,
                        padding: "10px 14px",
                    }}
                >
                    {error}
                </p>
            )}

            <Modal.Actions>
                <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
                    Keep Tournament
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleCancel} disabled={submitting}>
                    {submitting
                        ? <><Loader2 className="animate-spin size-[15px]" /> Cancelling…</>
                        : "Cancel & Refund"
                    }
                </Button>
            </Modal.Actions>
        </Modal>
    );
}
