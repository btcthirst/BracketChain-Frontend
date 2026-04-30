import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { EXTERNAL_LINKS } from "@/constants/links";
import { Token } from "../utils/types";

interface Props {
    token: Token;
    required: number;        // скільки потрібно
    available: number | null; // скільки є у гаманці
    loading: boolean;
    onRefresh: () => void;
}

export function BalanceWarning({ token, required, available, loading, onRefresh }: Props) {
    // Нічого не показуємо якщо: завантажується перший раз, або balance достатній
    if (loading && available === null) return null;
    if (available === null) return null;
    if (required <= 0) return null;
    if (available >= required) return null;

    const tokenLabel = token === "custom" ? "tokens" : token;
    const shortage = (required - available).toFixed(2);

    return (
        <div className="flex flex-col gap-3 bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 flex-1">
                    <p className="text-sm font-semibold text-amber-800">
                        Insufficient {tokenLabel} balance
                    </p>
                    <p className="text-sm text-amber-700">
                        Your wallet has{" "}
                        <span className="font-mono font-semibold">
                            {available.toFixed(2)} {tokenLabel}
                        </span>
                        . This tournament requires{" "}
                        <span className="font-mono font-semibold">
                            {required.toFixed(2)} {tokenLabel}
                        </span>{" "}
                        (you need{" "}
                        <span className="font-mono font-semibold text-red-600">
                            {shortage} more
                        </span>
                        ).
                    </p>
                </div>

                {/* Refresh balance button */}
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="shrink-0 p-1.5 rounded-md text-amber-500 hover:text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-40"
                    title="Refresh balance"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* On-ramp link — only for USDC and SOL */}
            {(token === "USDC" || token === "SOL") && (
                <a
                    href={EXTERNAL_LINKS.onRamp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors"
                >
                    Buy {tokenLabel} with card or bank transfer
                    <ExternalLink className="w-3 h-3" />
                </a>
            )}
        </div>
    );
}