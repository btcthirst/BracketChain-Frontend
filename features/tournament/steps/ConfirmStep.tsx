import { useState } from "react";
import { MotionDiv } from "@/components/ui/motion-wraper";
import { AlertCircle, Check, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { ROUTES } from "@/constants/links";
import { DetailsData, PrizeData, TxState } from "../utils/types";
import { totalPool } from "../utils/utils";
import { FORMAT_INFO, PAYOUT_PRESETS } from "../utils/constants";




export function ConfirmStep({
    detailsData,
    prizeData,
    onConfirm,
    txState,
    txError,
}: {
    detailsData: DetailsData;
    prizeData: PrizeData;
    onConfirm: () => void;
    txState: TxState;
    txError: string;
}) {
    const pool = totalPool(prizeData.deposit, detailsData.entryFee, detailsData.maxParticipants, detailsData.freeEntry);
    const cost = (parseFloat(prizeData.deposit) || 0) + 0.001;
    const [copied, setCopied] = useState(false);

    function copyId() {
        navigator.clipboard.writeText("demo-tournament-id-123");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (txState === "success") {
        return (
            <MotionDiv
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-5 py-12 text-center"
            >
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Tournament Created!</h2>
                <p className="text-gray-500 max-w-sm">Your tournament is now live on Solana. Share the link with participants.</p>
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 font-mono text-sm text-gray-700">
                    app.bracketchain.io/t/demo-tournament-id-123
                    <button onClick={copyId} className="text-gray-400 hover:text-gray-700">
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
                <a
                    href={ROUTES.tournament("demo-tournament-id-123")}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                    View Tournament →
                </a>
            </MotionDiv>
        );
    }

    const rows: [string, string][] = [
        ["Name", detailsData.name || "—"],
        ["Format", FORMAT_INFO[detailsData.format].label],
        ["Max Participants", `${detailsData.maxParticipants} players`],
        ["Start", detailsData.startDate && detailsData.startTime ? `${detailsData.startDate} at ${detailsData.startTime} UTC` : "—"],
        ["Entry Fee", detailsData.freeEntry ? "Free" : `${detailsData.entryFee} ${prizeData.token}`],
        ["Prize Token", prizeData.token === "custom" ? prizeData.customToken || "Custom SPL" : prizeData.token],
        ["Prize Pool", `${pool.toFixed(2)} ${prizeData.token}`],
        ["Payout", PAYOUT_PRESETS[prizeData.payoutPreset].label],
    ];

    return (
        <div className="flex flex-col gap-6">
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

            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-start gap-3">
                <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-blue-800">Cost to create</p>
                    <p className="text-2xl font-bold text-blue-900">{cost.toFixed(3)} {prizeData.token}</p>
                    <p className="text-xs text-blue-600 mt-1">
                        {parseFloat(prizeData.deposit) || 0} {prizeData.token} deposit + ~0.001 SOL transaction fee
                    </p>
                </div>
            </div>

            {txError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-800">Transaction failed</p>
                        <p className="text-sm text-red-700 mt-0.5">{txError}</p>
                    </div>
                </div>
            )}

            <button
                onClick={onConfirm}
                disabled={txState === "signing" || txState === "pending"}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-colors"
            >
                {txState === "signing" && <><Loader2 className="w-5 h-5 animate-spin" /> Awaiting wallet approval…</>}
                {txState === "pending" && <><Loader2 className="w-5 h-5 animate-spin" /> Creating tournament on Solana…</>}
                {(txState === "idle" || txState === "error") && <>Create Tournament</>}
            </button>

            <p className="text-center text-xs text-gray-400">
                This will open your connected wallet to sign a Solana transaction.
            </p>
        </div>
    );
}