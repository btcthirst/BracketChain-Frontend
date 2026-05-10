import { useEffect, useState } from "react";
import { MotionDiv } from "@/components/ui/motion-wraper";
import { AlertCircle, Check, CheckCircle2, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { ROUTES, SOLANA } from "@/constants/links";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
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
    // Hoisted above the success-screen early return to keep hook order stable
    // across renders (React errors with "Rendered fewer hooks than expected"
    // otherwise, since txState transitions idle → success in-place).
    const [showFinalConfirm, setShowFinalConfirm] = useState(false);
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
                    <Button variant="primary" size="lg" asChild className="mt-2">
                        <a href={ROUTES.tournament(tournamentAddress)}>
                            View Tournament →
                        </a>
                    </Button>
                )}
            </div>
        );
    }

    // ── Scope guards ──────────────────────────────────────────────────────────
    // The MVP program only supports SE + USDC. The wizard's earlier steps let
    // the user pick other options because the UI is V1-aware; here we surface
    // the gap *before* the wallet popup so they can fix it without burning a
    // signing intent. handleConfirm in the parent keeps the same checks as
    // defense-in-depth in case this banner is somehow bypassed.
    const scopeIssues: string[] = [];
    if (detailsData.format !== "SE") {
        scopeIssues.push("Only Single Elimination is supported in MVP. Go back and switch the format to SE.");
    }
    if (prizeData.token !== "USDC") {
        scopeIssues.push("Only USDC is supported in MVP. Go back and switch the prize token to USDC.");
    }
    if (prizeData.payoutPreset === "custom") {
        scopeIssues.push("Custom payout splits are not supported in MVP. Pick WTA, Standard, or Deep.");
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
    const isBlocked = scopeIssues.length > 0;
    const depositAmount = parseFloat(prizeData.deposit) || 0;

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

            {/* ── MVP scope issues (block Create) ─────────────────────────────── */}
            {isBlocked && (
                <div
                    style={{
                        background: "rgba(245,166,35,0.06)",
                        border: "1px solid rgba(245,166,35,0.22)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                    }}
                >
                    <AlertCircle size={16} style={{ color: "#f5a623", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                        <p
                            style={{
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                color: "#f5a623",
                                marginBottom: 4,
                                fontFamily: "'Inter', sans-serif",
                            }}
                        >
                            {scopeIssues.length === 1 ? "One thing to fix before you can create" : "A few things to fix before you can create"}
                        </p>
                        <ul
                            style={{
                                fontSize: "0.8rem",
                                color: "rgba(245,166,35,0.75)",
                                margin: 0,
                                paddingLeft: 18,
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                            }}
                        >
                            {scopeIssues.map(msg => <li key={msg}>{msg}</li>)}
                        </ul>
                    </div>
                </div>
            )}

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
                    <Button variant="destructive" size="sm" onClick={onRetry} className="shrink-0">
                        <RefreshCw className="size-3" />
                        Retry
                    </Button>
                </MotionDiv>
            )}

            {/* Primary action */}
            <Button
                variant="primary"
                size="lg"
                className="w-full text-base py-[14px] h-auto"
                onClick={txState === "error" ? onRetry : () => setShowFinalConfirm(true)}
                disabled={isProcessing || isBlocked}
                title={isBlocked ? "Resolve the issues above to continue" : undefined}
            >
                {txState === "signing" && (
                    <><Loader2 size={18} className="animate-spin" /> Awaiting wallet approval…</>
                )}
                {txState === "pending" && (
                    <><Loader2 size={18} className="animate-spin" /> Creating tournament on Solana…</>
                )}
                {txState === "idle" && (isBlocked ? <>Fix issues to continue</> : <>Create Tournament</>)}
                {txState === "error" && (
                    <><RefreshCw size={18} /> Try Again</>
                )}
            </Button>

            <p style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(240,241,245,0.2)" }}>
                {isBlocked
                    ? "Resolve the issues above, then return here to sign and submit."
                    : "This will open your connected wallet to sign a Solana transaction."}
            </p>

            {/* ── Final pre-sign confirmation ─────────────────────────────── */}
            <Modal open={showFinalConfirm} onClose={() => setShowFinalConfirm(false)} maxWidth={384}>
                <Modal.Header onClose={() => setShowFinalConfirm(false)}>
                    <h3
                        style={{
                            fontFamily: "'Syne', sans-serif",
                            fontWeight: 700,
                            fontSize: "1rem",
                            color: "#f0f1f5",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        Create this tournament on-chain?
                    </h3>
                </Modal.Header>

                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        background: "rgba(245,166,35,0.07)",
                        border: "1px solid rgba(245,166,35,0.22)",
                        borderRadius: 12,
                        padding: "12px 14px",
                    }}
                >
                    <AlertCircle size={18} style={{ color: "#f5a623", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f5a623", fontFamily: "'Inter', sans-serif" }}>
                            {depositAmount > 0
                                ? `You'll deposit ${depositAmount} ${prizeData.token} into the prize vault.`
                                : "Your tournament will be created on-chain."}
                        </p>
                        <p style={{ fontSize: "0.78rem", color: "rgba(245,166,35,0.75)", lineHeight: 1.5 }}>
                            Once signed and confirmed, the tournament is live. The vault is unlocked
                            only by completion or cancellation — both of which require another
                            on-chain transaction.
                        </p>
                    </div>
                </div>

                <Modal.Actions>
                    <Button variant="outline" className="flex-1" onClick={() => setShowFinalConfirm(false)}>
                        Back
                    </Button>
                    <Button
                        variant="primary"
                        className="flex-1"
                        onClick={() => { setShowFinalConfirm(false); onConfirm(); }}
                    >
                        {depositAmount > 0
                            ? `Sign & deposit ${depositAmount} ${prizeData.token}`
                            : "Sign & create"}
                    </Button>
                </Modal.Actions>
            </Modal>
        </div>
    );
}
