import { useEffect } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputCls, totalPool } from "../utils/utils";
import { PROTOCOL_FEE, PAYOUT_PRESETS, TOKEN_INFO } from "@/constants/tournament";
import { DetailsData, PayoutPreset, PrizeData, Token } from "@/types/tournament";
import type { Step2Errors } from "./ValidateState";
import { FieldGroup } from "./FieldGroup";
import { BalanceWarning } from "./BalanceWarning";
import { useWalletBalance } from "@/hooks/useWalletBalance";

export function PrizeStep({
    data,
    detailsData,
    onChange,
    connected,
    onConnect,
    errors = {},
}: {
    data: PrizeData;
    detailsData: DetailsData;
    onChange: (d: Partial<PrizeData>) => void;
    connected: boolean;
    onConnect: () => void;
    errors?: Step2Errors;
}) {
    const pool = totalPool(data.deposit, detailsData.entryFee, detailsData.maxParticipants, detailsData.freeEntry);
    const afterFee = pool * (1 - PROTOCOL_FEE);
    const pctSum = data.payoutEntries.reduce((a, e) => a + e.pct, 0);

    const { sol, usdc, loading: balanceLoading, refresh: refreshBalance } = useWalletBalance();

    const requiredDeposit = parseFloat(data.deposit) || 0;
    const availableBalance = data.token === "SOL" ? sol : data.token === "USDC" ? usdc : null;

    function handlePreset(preset: PayoutPreset) {
        onChange({ payoutPreset: preset, payoutEntries: [...PAYOUT_PRESETS[preset].entries] });
    }

    useEffect(() => {
        if (PAYOUT_PRESETS[data.payoutPreset].minParticipants > detailsData.maxParticipants) {
            onChange({ payoutPreset: "wta", payoutEntries: [...PAYOUT_PRESETS.wta.entries] });
        }
    }, [detailsData.maxParticipants, data.payoutPreset, onChange]);

    function handlePctChange(idx: number, val: string) {
        const entries = data.payoutEntries.map((e, i) =>
            i === idx ? { ...e, pct: parseFloat(val) || 0 } : e
        );
        onChange({ payoutEntries: entries });
    }

    function addCustomRow() {
        onChange({
            payoutEntries: [
                ...data.payoutEntries,
                { place: data.payoutEntries.length + 1, label: `${data.payoutEntries.length + 1}th`, pct: 0 },
            ],
        });
    }

    function removeCustomRow(idx: number) {
        onChange({ payoutEntries: data.payoutEntries.filter((_, i) => i !== idx) });
    }

    if (!connected) {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "64px 0",
                    gap: 16,
                    textAlign: "center",
                }}
            >
                <div
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "rgba(34,212,126,0.08)",
                        border: "1px solid rgba(34,212,126,0.20)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Trophy size={28} style={{ color: "#22d47e" }} />
                </div>
                <h3
                    style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        color: "#f0f1f5",
                        letterSpacing: "-0.01em",
                    }}
                >
                    Connect your wallet to continue
                </h3>
                <p style={{ fontSize: "0.85rem", color: "rgba(240,241,245,0.4)", maxWidth: 300 }}>
                    You need a connected Solana wallet to configure the prize pool and sign the on-chain transaction.
                </p>
                <Button variant="primary" onClick={onConnect} className="mt-2 px-7">
                    Connect Wallet
                </Button>
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
            <div className="flex flex-col gap-6">
                <FieldGroup label="Prize Token" hint="All entry fees and deposits must use the same token.">
                    <select
                        className={inputCls()}
                        value={data.token}
                        onChange={e => onChange({ token: e.target.value as Token })}
                    >
                        {(Object.entries(TOKEN_INFO) as [
                            Token,
                            { label: string; available: boolean }
                        ][]).map(([key, { label, available }]) => (
                            <option key={key} value={key} disabled={!available}>
                                {label}
                            </option>
                        ))}
                    </select>
                    {data.token === "custom" && (
                        <>
                            <input
                                className={inputCls() + " mt-2"}
                                placeholder="Token mint address"
                                value={data.customToken}
                                onChange={e => onChange({ customToken: e.target.value })}
                            />
                            {errors.customToken && (
                                <p className="mt-1 text-xs text-red-600">{errors.customToken}</p>
                            )}
                        </>
                    )}
                </FieldGroup>

                <FieldGroup
                    label="Organizer Deposit"
                    hint="Amount you're adding to the prize pool from your wallet. Can be 0 if entry fees alone fund the prizes."
                >
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            className={inputCls()}
                            placeholder="0.00"
                            value={data.deposit}
                            onChange={e => onChange({ deposit: e.target.value })}
                        />
                        <span
                            style={{
                                position: "absolute",
                                right: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "0.72rem",
                                fontWeight: 500,
                                color: "rgba(240,241,245,0.35)",
                            }}
                        >
                            {data.token}
                        </span>
                    </div>

                    {connected && availableBalance !== null && (
                        <p style={{ fontSize: "0.72rem", color: "rgba(240,241,245,0.3)", marginTop: 4 }}>
                            Wallet balance:{" "}
                            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: "rgba(240,241,245,0.55)" }}>
                                {availableBalance.toFixed(2)} {data.token === "custom" ? "tokens" : data.token}
                            </span>
                        </p>
                    )}
                    {errors.deposit && (
                        <p className="mt-1 text-xs text-red-600">{errors.deposit}</p>
                    )}
                </FieldGroup>

                <BalanceWarning
                    token={data.token}
                    required={requiredDeposit}
                    available={availableBalance}
                    loading={balanceLoading}
                    onRefresh={refreshBalance}
                />

                <div className="flex flex-col gap-3">
                    <span
                        style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "0.68rem",
                            fontWeight: 500,
                            color: "rgba(240,241,245,0.45)",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                        }}
                    >
                        Payout Structure
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {(Object.entries(PAYOUT_PRESETS) as [
                            PayoutPreset,
                            { label: string; available: boolean; minParticipants: number }
                        ][]).map(([key, { label, available, minParticipants }]) => {
                            const isSelected = data.payoutPreset === key;
                            const tooFewPlayers = minParticipants > detailsData.maxParticipants;
                            const enabled = available && !tooFewPlayers;
                            const title = !available
                                ? "Coming in V2"
                                : tooFewPlayers
                                    ? `Requires ≥${minParticipants} players (currently ${detailsData.maxParticipants})`
                                    : undefined;
                            return (
                                <button
                                    key={key}
                                    onClick={() => enabled && handlePreset(key)}
                                    disabled={!enabled}
                                    title={title}
                                    style={{
                                        padding: "6px 14px",
                                        borderRadius: 7,
                                        fontSize: "0.78rem",
                                        fontWeight: 600,
                                        border: "1px solid",
                                        cursor: enabled ? "pointer" : "not-allowed",
                                        transition: "all 0.15s",
                                        fontFamily: "'DM Mono', monospace",
                                        letterSpacing: "0.02em",
                                        ...(!enabled
                                            ? { background: "transparent", borderColor: "rgba(255,255,255,0.05)", color: "rgba(240,241,245,0.2)" }
                                            : isSelected
                                                ? { background: "rgba(34,212,126,0.12)", borderColor: "rgba(34,212,126,0.35)", color: "#22d47e" }
                                                : { background: "transparent", borderColor: "rgba(255,255,255,0.1)", color: "rgba(240,241,245,0.5)" }),
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-2 mt-1">
                        {data.payoutEntries.map((entry, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span
                                    style={{
                                        fontFamily: "'DM Mono', monospace",
                                        fontSize: "0.75rem",
                                        color: "rgba(240,241,245,0.35)",
                                        width: 36,
                                        flexShrink: 0,
                                    }}
                                >
                                    {entry.label}
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={entry.pct}
                                    onChange={e => handlePctChange(idx, e.target.value)}
                                    disabled={data.payoutPreset !== "custom"}
                                    style={{
                                        width: 80,
                                        padding: "6px 8px",
                                        borderRadius: 6,
                                        border: "1px solid",
                                        fontSize: "0.82rem",
                                        textAlign: "right",
                                        fontFamily: "'DM Mono', monospace",
                                        outline: "none",
                                        transition: "border-color 0.15s",
                                        ...(data.payoutPreset === "custom"
                                            ? { background: "rgba(30,33,50,0.9)", borderColor: "rgba(255,255,255,0.1)", color: "#f0f1f5" }
                                            : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.05)", color: "rgba(240,241,245,0.3)" }),
                                    }}
                                />
                                <span style={{ fontSize: "0.8rem", color: "rgba(240,241,245,0.3)" }}>%</span>
                                <span
                                    style={{
                                        fontSize: "0.78rem",
                                        color: "rgba(240,241,245,0.4)",
                                        marginLeft: "auto",
                                        fontFamily: "'DM Mono', monospace",
                                    }}
                                >
                                    {afterFee > 0 ? `≈ ${((entry.pct / 100) * afterFee).toFixed(2)} ${data.token}` : ""}
                                </span>
                                {data.payoutPreset === "custom" && (
                                    <button
                                        onClick={() => removeCustomRow(idx)}
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            color: "rgba(240,241,245,0.2)",
                                            cursor: "pointer",
                                            fontSize: "0.75rem",
                                            padding: 2,
                                            transition: "color 0.15s",
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = "#f04e66"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.2)"; }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        {data.payoutPreset === "custom" && (
                            <button
                                onClick={addCustomRow}
                                style={{
                                    alignSelf: "flex-start",
                                    background: "transparent",
                                    border: "none",
                                    fontSize: "0.75rem",
                                    color: "rgba(34,212,126,0.6)",
                                    cursor: "pointer",
                                    padding: 0,
                                    marginTop: 4,
                                    transition: "color 0.15s",
                                    fontFamily: "'Inter', sans-serif",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "#22d47e"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(34,212,126,0.6)"; }}
                            >
                                + Add placement
                            </button>
                        )}
                    </div>

                    {data.payoutPreset === "custom" && pctSum !== 100 && (
                        <p
                            style={{
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                color: pctSum > 100 ? "#f04e66" : "#f5a623",
                            }}
                        >
                            Percentages sum to {pctSum.toFixed(1)}% — must equal 100%
                        </p>
                    )}
                    {errors.payoutEntries && (
                        <p className="text-xs font-medium text-red-600">{errors.payoutEntries}</p>
                    )}
                </div>

                {/* Protocol fee notice */}
                <div
                    style={{
                        background: "rgba(34,212,126,0.05)",
                        border: "1px solid rgba(34,212,126,0.14)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontSize: "0.8rem",
                        color: "rgba(240,241,245,0.45)",
                    }}
                >
                    <span style={{ fontWeight: 600, color: "rgba(34,212,126,0.8)" }}>Protocol fee:</span>{" "}
                    3.5% deducted from total prize pool at payout time. Prize amounts shown above are after-fee estimates.
                </div>
            </div>

            {/* Live preview */}
            <div className="lg:sticky lg:top-6 h-fit">
                <div
                    style={{
                        background: "rgba(13,15,24,0.9)",
                        border: "1px solid rgba(34,212,126,0.10)",
                        borderRadius: 12,
                        padding: 20,
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        boxShadow: "0 0 40px rgba(34,212,126,0.04)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Trophy size={15} style={{ color: "#f5a623" }} />
                        <span
                            style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "0.7rem",
                                color: "rgba(240,241,245,0.35)",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                            }}
                        >
                            Prize Pool Preview
                        </span>
                    </div>

                    <div>
                        <span
                            style={{
                                fontFamily: "'Syne', sans-serif",
                                fontWeight: 800,
                                fontSize: "2.2rem",
                                color: "#f0f1f5",
                                letterSpacing: "-0.03em",
                            }}
                        >
                            {pool.toFixed(2)}
                        </span>{" "}
                        <span style={{ fontSize: "0.9rem", color: "rgba(240,241,245,0.35)", fontFamily: "'DM Mono', monospace" }}>
                            {data.token}
                        </span>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            borderTop: "1px solid rgba(255,255,255,0.07)",
                            paddingTop: 12,
                        }}
                    >
                        {[
                            { label: "Organizer deposit", value: `${parseFloat(data.deposit) || 0} ${data.token}`, color: undefined },
                            ...(!detailsData.freeEntry ? [{
                                label: `Entry fees (${detailsData.maxParticipants} × ${parseFloat(detailsData.entryFee) || 0})`,
                                value: `${((parseFloat(detailsData.entryFee) || 0) * detailsData.maxParticipants).toFixed(2)} ${data.token}`,
                                color: undefined,
                            }] : []),
                        ].map((row) => (
                            <div key={row.label} style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "0.75rem", color: "rgba(240,241,245,0.3)" }}>{row.label}</span>
                                <span style={{ fontSize: "0.75rem", color: "rgba(240,241,245,0.7)", fontFamily: "'DM Mono', monospace" }}>{row.value}</span>
                            </div>
                        ))}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                borderTop: "1px solid rgba(255,255,255,0.06)",
                                paddingTop: 6,
                            }}
                        >
                            <span style={{ fontSize: "0.75rem", color: "#f04e66" }}>Protocol fee (3.5%)</span>
                            <span style={{ fontSize: "0.75rem", color: "#f04e66", fontFamily: "'DM Mono', monospace" }}>
                                −{(pool * PROTOCOL_FEE).toFixed(2)}
                            </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#22d47e" }}>Net to winners</span>
                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#22d47e", fontFamily: "'DM Mono', monospace" }}>
                                {afterFee.toFixed(2)} {data.token}
                            </span>
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 5,
                            borderTop: "1px solid rgba(255,255,255,0.07)",
                            paddingTop: 12,
                        }}
                    >
                        {data.payoutEntries.map((e, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "0.72rem", color: "rgba(240,241,245,0.3)", fontFamily: "'DM Mono', monospace" }}>
                                    {e.label} — {e.pct}%
                                </span>
                                <span style={{ fontSize: "0.72rem", color: "rgba(240,241,245,0.6)", fontFamily: "'DM Mono', monospace" }}>
                                    {afterFee > 0 ? `${((e.pct / 100) * afterFee).toFixed(2)} ${data.token}` : "—"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
