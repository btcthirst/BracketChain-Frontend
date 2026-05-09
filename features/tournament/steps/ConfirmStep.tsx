import { useEffect, useState } from "react";
import { MotionDiv } from "@/components/ui/motion-wraper";
import { AlertCircle, Check, CheckCircle2, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { ROUTES, SOLANA } from "@/constants/links";
import { DetailsData, PrizeData, TxState } from "@/types/tournament";
import { totalPool } from "@/features/tournament/utils/utils";
import { FORMAT_INFO, PAYOUT_PRESETS } from "@/constants/tournament";
import { useConfetti } from "@/hooks/useConfetti";

export function ConfirmStep({
    detailsData,
    prizeData,
    onConfirm,
    onRetry,
    txState,
    txError,
    tournamentAddress,
    txSignature,
}: {
    detailsData: DetailsData;
    prizeData: PrizeData;
    onConfirm: () => void;
    onRetry: () => void;
    txState: TxState;
    txError: string;
    tournamentAddress: string | null;
    txSignature: string | null;
}) {
    const pool = totalPool(prizeData.deposit, detailsData.entryFee, detailsData.maxParticipants, detailsData.freeEntry);
    const cost = (parseFloat(prizeData.deposit) || 0) + 0.001;
    const [copied, setCopied] = useState(false);
    const { fire: fireConfetti } = useConfetti();

    useEffect(() => {
        if (txState !== "success") return;
        const t = setTimeout(() => { fireConfetti(); }, 0);
        return () => clearTimeout(t);
    }, [txState, fireConfetti]);

    const shareId = tournamentAddress ?? "";
    const shareUrl = shareId
        ? `${typeof window !== "undefined" ? window.location.origin : "app.bracketchain.io"}${ROUTES.tournament(shareId)}`
        : "";

    function copyShareUrl() {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    // ── Success screen ────────────────────────────────────────────────────────
    if (txState === "success") {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 20,
                    padding: "64px 0",
                    textAlign: "center",
                    animation: "fadeIn 0.3s ease",
                }}
            >
                <div
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: "rgba(34,212,126,0.10)",
                        border: "1px solid rgba(34,212,126,0.30)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 32px rgba(34,212,126,0.15)",
                    }}
                >
                    <CheckCircle2 size={36} style={{ color: "#22d47e" }} />
                </div>
                <h2
                    style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: "clamp(1.4rem, 3vw, 2rem)",
                        color: "#f0f1f5",
                        letterSpacing: "-0.02em",
                    }}
                >
                    Tournament Created!
                </h2>
                <p style={{ fontSize: "0.9rem", color: "rgba(240,241,245,0.4)", maxWidth: 340 }}>
                    Your tournament is now live on Solana. Share the link with participants.
                </p>

                {shareUrl && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "rgba(13,15,24,0.9)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8,
                            padding: "10px 14px",
                            maxWidth: "100%",
                            overflow: "hidden",
                        }}
                    >
                        <span
                            style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "0.72rem",
                                color: "rgba(240,241,245,0.45)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {shareUrl}
                        </span>
                        <button
                            onClick={copyShareUrl}
                            style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                flexShrink: 0,
                                color: copied ? "#22d47e" : "rgba(240,241,245,0.3)",
                                transition: "color 0.15s",
                                padding: 2,
                            }}
                        >
                            {copied ? <Check size={15} /> : <Copy size={15} />}
                        </button>
                    </div>
                )}

                {txSignature && (
                    <a
                        href={SOLANA.explorerTx(txSignature)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.75rem",
                            color: "rgba(240,241,245,0.3)",
                            textDecoration: "none",
                            transition: "color 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.6)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.3)"; }}
                    >
                        View transaction on Solana Explorer
                        <ExternalLink size={11} />
                    </a>
                )}

                {tournamentAddress && (
                    <a
                        href={ROUTES.tournament(tournamentAddress)}
                        style={{
                            marginTop: 8,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "12px 28px",
                            background: "#22d47e",
                            color: "#06070b",
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            textDecoration: "none",
                            fontFamily: "'Inter', sans-serif",
                            transition: "background 0.15s, box-shadow 0.15s",
                            boxShadow: "0 0 20px rgba(34,212,126,0.30)",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#16c062";
                            e.currentTarget.style.boxShadow = "0 0 32px rgba(34,212,126,0.50)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#22d47e";
                            e.currentTarget.style.boxShadow = "0 0 20px rgba(34,212,126,0.30)";
                        }}
                    >
                        View Tournament →
                    </a>
                )}
            </div>
        );
    }

    // ── Summary rows ──────────────────────────────────────────────────────────
    const rows: [string, string][] = [
        ["Name", detailsData.name || "—"],
        ["Format", FORMAT_INFO[detailsData.format].label],
        ["Max Participants", `${detailsData.maxParticipants} players`],
        ["Registration Closes", detailsData.startDate && detailsData.startTime
            ? `${detailsData.startDate} at ${detailsData.startTime} UTC`
            : "—"],
        ["Entry Fee", detailsData.freeEntry ? "Free" : `${detailsData.entryFee} ${prizeData.token}`],
        ["Prize Token", prizeData.token === "custom" ? prizeData.customToken || "Custom SPL" : prizeData.token],
        ["Prize Pool", `${pool.toFixed(2)} ${prizeData.token}`],
        ["Payout", PAYOUT_PRESETS[prizeData.payoutPreset].label],
    ];

    const isProcessing = txState === "signing" || txState === "pending";

    return (
        <div className="flex flex-col gap-6">
            {/* Summary table */}
            <div
                style={{
                    background: "rgba(13,15,24,0.8)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 12,
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        padding: "12px 20px",
                    }}
                >
                    <h3
                        style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "0.68rem",
                            fontWeight: 500,
                            color: "rgba(240,241,245,0.35)",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                        }}
                    >
                        Tournament Summary
                    </h3>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                        {rows.map(([label, value], i) => (
                            <tr
                                key={label}
                                style={{
                                    borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                                }}
                            >
                                <td
                                    style={{
                                        padding: "11px 20px",
                                        fontSize: "0.78rem",
                                        color: "rgba(240,241,245,0.35)",
                                        width: 160,
                                        fontFamily: "'DM Mono', monospace",
                                        letterSpacing: "0.02em",
                                    }}
                                >
                                    {label}
                                </td>
                                <td
                                    style={{
                                        padding: "11px 20px",
                                        fontSize: "0.85rem",
                                        color: "#f0f1f5",
                                        fontWeight: 500,
                                    }}
                                >
                                    {value}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Cost */}
            <div
                style={{
                    background: "rgba(34,212,126,0.06)",
                    border: "1px solid rgba(34,212,126,0.16)",
                    borderRadius: 12,
                    padding: "16px 20px",
                }}
            >
                <p
                    style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.68rem",
                        color: "rgba(34,212,126,0.7)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                    }}
                >
                    Cost to create
                </p>
                <p
                    style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 800,
                        fontSize: "1.8rem",
                        color: "#f0f1f5",
                        letterSpacing: "-0.02em",
                        marginBottom: 4,
                    }}
                >
                    {cost.toFixed(3)}{" "}
                    <span style={{ fontSize: "1rem", fontWeight: 500, color: "rgba(240,241,245,0.4)", fontFamily: "'DM Mono', monospace" }}>
                        {prizeData.token}
                    </span>
                </p>
                <p style={{ fontSize: "0.75rem", color: "rgba(240,241,245,0.35)" }}>
                    {parseFloat(prizeData.deposit) || 0} {prizeData.token} deposit + ~0.001 SOL transaction fee
                </p>
            </div>

            {/* Error state */}
            {txState === "error" && (
                <MotionDiv
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: "rgba(240,78,102,0.07)",
                        border: "1px solid rgba(240,78,102,0.25)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                    }}
                >
                    <AlertCircle size={16} style={{ color: "#f04e66", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f04e66", marginBottom: 4 }}>
                            Transaction failed
                        </p>
                        <p style={{ fontSize: "0.8rem", color: "rgba(240,78,102,0.75)", wordBreak: "break-word" }}>
                            {txError}
                        </p>
                    </div>
                    <button
                        onClick={onRetry}
                        style={{
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "#f04e66",
                            background: "rgba(240,78,102,0.10)",
                            border: "none",
                            borderRadius: 6,
                            padding: "6px 10px",
                            cursor: "pointer",
                            transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(240,78,102,0.18)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(240,78,102,0.10)"; }}
                    >
                        <RefreshCw size={12} />
                        Retry
                    </button>
                </MotionDiv>
            )}

            {/* Primary action */}
            <button
                onClick={txState === "error" ? onRetry : onConfirm}
                disabled={isProcessing}
                style={{
                    width: "100%",
                    padding: "14px 24px",
                    borderRadius: 10,
                    border: "none",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    cursor: isProcessing ? "not-allowed" : "pointer",
                    transition: "background 0.15s, box-shadow 0.15s, opacity 0.15s",
                    background: isProcessing ? "rgba(34,212,126,0.4)" : "#22d47e",
                    color: "#06070b",
                    boxShadow: isProcessing ? "none" : "0 0 24px rgba(34,212,126,0.30)",
                    opacity: isProcessing ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                    if (!isProcessing) {
                        e.currentTarget.style.background = "#16c062";
                        e.currentTarget.style.boxShadow = "0 0 36px rgba(34,212,126,0.50)";
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isProcessing) {
                        e.currentTarget.style.background = "#22d47e";
                        e.currentTarget.style.boxShadow = "0 0 24px rgba(34,212,126,0.30)";
                    }
                }}
            >
                {txState === "signing" && (
                    <><Loader2 size={18} className="animate-spin" /> Awaiting wallet approval…</>
                )}
                {txState === "pending" && (
                    <><Loader2 size={18} className="animate-spin" /> Creating tournament on Solana…</>
                )}
                {txState === "idle" && <>Create Tournament</>}
                {txState === "error" && (
                    <><RefreshCw size={18} /> Try Again</>
                )}
            </button>

            <p style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(240,241,245,0.2)" }}>
                This will open your connected wallet to sign a Solana transaction.
            </p>
        </div>
    );
}
