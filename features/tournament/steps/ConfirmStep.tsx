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

    // Fire confetti once on success — defer to next tick so React finishes its commit
    // before canvas-confetti mutates document.body. Without the deferral, React 19 +
    // motion's unmount path can race with confetti's DOM appends and throw
    // `removeChild` NotFoundError in dev mode.
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
    // Plain div (no MotionDiv) — motion's unmount race with canvas-confetti causes
    // `removeChild` NotFoundError in React 19 dev mode. CSS fade-in is enough.
    if (txState === "success") {
        return (
            <div className="flex flex-col items-center gap-5 py-12 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Tournament Created!</h2>
                <p className="text-gray-500 max-w-sm">
                    Your tournament is now live on Solana. Share the link with participants.
                </p>
                {shareUrl && (
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 font-mono text-xs text-gray-700 max-w-full overflow-hidden">
                        <span className="truncate">{shareUrl}</span>
                        <button onClick={copyShareUrl} className="text-gray-400 hover:text-gray-700 shrink-0">
                            {copied
                                ? <Check className="w-4 h-4 text-green-500" />
                                : <Copy className="w-4 h-4" />
                            }
                        </button>
                    </div>
                )}
                {txSignature && (
                    <a
                        href={SOLANA.explorerTx(txSignature)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                    >
                        View transaction on Solana Explorer
                        <ExternalLink className="w-3 h-3" />
                    </a>
                )}
                {tournamentAddress && (
                    <a
                        href={ROUTES.tournament(tournamentAddress)}
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
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
        ["Start", detailsData.startDate && detailsData.startTime
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
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
                    <h3 className="text-sm font-semibold text-gray-700">Tournament Summary</h3>
                </div>
                <table className="w-full text-sm">
                    <tbody>
                        {rows.map(([label, value]) => (
                            <tr key={label} className="border-b border-gray-100 last:border-0">
                                <td className="px-5 py-3 text-gray-500 w-40">{label}</td>
                                <td className="px-5 py-3 text-gray-900 font-medium">{value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Cost */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
                <p className="text-sm font-semibold text-blue-800">Cost to create</p>
                <p className="text-2xl font-bold text-blue-900 mt-0.5">
                    {cost.toFixed(3)} {prizeData.token}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                    {parseFloat(prizeData.deposit) || 0} {prizeData.token} deposit + ~0.001 SOL transaction fee
                </p>
            </div>

            {/* ── Error state ──────────────────────────────────────────────────── */}
            {txState === "error" && (
                <MotionDiv
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3"
                >
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-red-800">Transaction failed</p>
                        <p className="text-sm text-red-700 mt-0.5 break-words">{txError}</p>
                    </div>
                    {/* Retry button inside the error banner */}
                    <button
                        onClick={onRetry}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry
                    </button>
                </MotionDiv>
            )}

            {/* ── Primary action button ─────────────────────────────────────── */}
            <button
                onClick={txState === "error" ? onRetry : onConfirm}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-colors"
            >
                {txState === "signing" && (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Awaiting wallet approval…</>
                )}
                {txState === "pending" && (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Creating tournament on Solana…</>
                )}
                {txState === "idle" && <>Create Tournament</>}
                {txState === "error" && (
                    <><RefreshCw className="w-5 h-5" /> Try Again</>
                )}
            </button>

            <p className="text-center text-xs text-gray-400">
                This will open your connected wallet to sign a Solana transaction.
            </p>
        </div>
    );
}