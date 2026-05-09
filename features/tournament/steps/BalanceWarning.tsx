import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { EXTERNAL_LINKS } from "@/constants/links";
import { Token } from "@/types/tournament";

interface Props {
    token: Token;
    required: number;
    available: number | null;
    loading: boolean;
    onRefresh: () => void;
}

export function BalanceWarning({ token, required, available, loading, onRefresh }: Props) {
    if (loading && available === null) return null;
    if (available === null) return null;
    if (required <= 0) return null;
    if (available >= required) return null;

    const tokenLabel = token === "custom" ? "tokens" : token;
    const shortage = (required - available).toFixed(2);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: "rgba(245,166,35,0.07)",
                border: "1px solid rgba(245,166,35,0.25)",
                borderRadius: 10,
                padding: "14px 16px",
            }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <AlertTriangle size={16} style={{ color: "#f5a623", flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f5a623", marginBottom: 4 }}>
                        Insufficient {tokenLabel} balance
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "rgba(245,166,35,0.75)", lineHeight: 1.5 }}>
                        Your wallet has{" "}
                        <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                            {available.toFixed(2)} {tokenLabel}
                        </span>
                        . This tournament requires{" "}
                        <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                            {required.toFixed(2)} {tokenLabel}
                        </span>{" "}
                        (you need{" "}
                        <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#f04e66" }}>
                            {shortage} more
                        </span>
                        ).
                    </p>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    style={{
                        flexShrink: 0,
                        padding: 6,
                        borderRadius: 6,
                        background: "transparent",
                        border: "none",
                        color: "#f5a623",
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.4 : 1,
                        transition: "background 0.15s",
                    }}
                    title="Refresh balance"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {(token === "USDC" || token === "SOL") && (
                <a
                    href={EXTERNAL_LINKS.onRamp}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "rgba(245,166,35,0.8)",
                        textDecoration: "underline",
                        textUnderlineOffset: 2,
                    }}
                >
                    Buy {tokenLabel} with card or bank transfer
                    <ExternalLink size={11} />
                </a>
            )}
        </div>
    );
}
