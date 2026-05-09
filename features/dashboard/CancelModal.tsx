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
            await cancelTournament(sdk, { tournamentPda: new PublicKey(tournamentId) });
            toast.success("Tournament cancelled. Entry fees have been refunded.");
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#f0f1f5" }}>
                        Cancel Tournament
                    </h3>
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

                {/* Warning */}
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

                {/* Error */}
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
                        Keep Tournament
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={submitting}
                        style={{
                            flex: 1,
                            padding: "10px 0",
                            borderRadius: 10,
                            background: submitting ? "rgba(255,255,255,0.06)" : "rgba(240,78,102,0.12)",
                            border: `1px solid ${submitting ? "rgba(255,255,255,0.08)" : "rgba(240,78,102,0.3)"}`,
                            color: submitting ? "rgba(240,241,245,0.3)" : "#f04e66",
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            cursor: submitting ? "not-allowed" : "pointer",
                            transition: "background 0.15s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                        }}
                        onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = "rgba(240,78,102,0.2)"; }}
                        onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = "rgba(240,78,102,0.12)"; }}
                    >
                        {submitting
                            ? <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Cancelling…</>
                            : "Cancel & Refund"
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
