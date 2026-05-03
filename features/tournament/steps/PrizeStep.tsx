import { useEffect } from "react";
import { Trophy } from "lucide-react";
import { inputCls, totalPool } from "../utils/utils";
import { PROTOCOL_FEE, PAYOUT_PRESETS, TOKEN_INFO } from "@/constants/tournament";
import { DetailsData, PayoutPreset, PrizeData, Token } from "@/types/tournament";
import { FieldGroup } from "./FieldGroup";
import { BalanceWarning } from "./BalanceWarning";
import { useWalletBalance } from "@/hooks/useWalletBalance";

export function PrizeStep({
    data,
    detailsData,
    onChange,
    connected,
    onConnect,
}: {
    data: PrizeData;
    detailsData: DetailsData;
    onChange: (d: Partial<PrizeData>) => void;
    connected: boolean;
    onConnect: () => void;
}) {
    const pool = totalPool(data.deposit, detailsData.entryFee, detailsData.maxParticipants, detailsData.freeEntry);
    const afterFee = pool * (1 - PROTOCOL_FEE);
    const pctSum = data.payoutEntries.reduce((a, e) => a + e.pct, 0);

    // ── Balance ──────────────────────────────────────────────────────────────
    const { sol, usdc, loading: balanceLoading, refresh: refreshBalance } = useWalletBalance();

    // Required = organizer deposit only (entry fees come from participants)
    const requiredDeposit = parseFloat(data.deposit) || 0;
    const availableBalance = data.token === "SOL" ? sol : data.token === "USDC" ? usdc : null;

    function handlePreset(preset: PayoutPreset) {
        onChange({ payoutPreset: preset, payoutEntries: [...PAYOUT_PRESETS[preset].entries] });
    }

    // Snap to WTA if current preset's min_participants exceeds maxParticipants
    // (e.g. user picked Standard then dropped to 2 players). Mirrors the
    // program-side check in `create_tournament.rs` — without this snap the user
    // only sees `PresetExceedsParticipants` after signing.
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
            <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Connect your wallet to continue</h3>
                <p className="text-sm text-gray-500 text-center max-w-xs">
                    You need a connected Solana wallet to configure the prize pool and sign the on-chain transaction.
                </p>
                <button
                    onClick={onConnect}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                    Connect Wallet
                </button>
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
                        <input
                            className={inputCls() + " mt-2"}
                            placeholder="Token mint address"
                            value={data.customToken}
                            onChange={e => onChange({ customToken: e.target.value })}
                        />
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">
                            {data.token}
                        </span>
                    </div>

                    {/* Wallet balance display */}
                    {connected && availableBalance !== null && (
                        <p className="text-xs text-gray-500 mt-1">
                            Wallet balance:{" "}
                            <span className="font-mono font-medium text-gray-700">
                                {availableBalance.toFixed(2)} {data.token === "custom" ? "tokens" : data.token}
                            </span>
                        </p>
                    )}
                </FieldGroup>

                {/* ── Balance warning ── */}
                <BalanceWarning
                    token={data.token}
                    required={requiredDeposit}
                    available={availableBalance}
                    loading={balanceLoading}
                    onRefresh={refreshBalance}
                />

                <div className="flex flex-col gap-3">
                    <span className="text-sm font-semibold text-gray-800">Payout Structure</span>
                    <div className="flex flex-wrap gap-2">
                        {(Object.entries(PAYOUT_PRESETS) as [
                            PayoutPreset,
                            { label: string; available: boolean; minParticipants: number }
                        ][]).map(([key, { label, available, minParticipants }]) => {
                            const isSelected = data.payoutPreset === key;
                            const tooFewPlayers = minParticipants > detailsData.maxParticipants;
                            const enabled = available && !tooFewPlayers;
                            const baseCls =
                                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all";
                            const cls = !enabled
                                ? `${baseCls} bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed`
                                : isSelected
                                ? `${baseCls} bg-blue-600 border-blue-600 text-white`
                                : `${baseCls} bg-white border-gray-300 text-gray-600 hover:border-blue-400`;
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
                                    className={cls}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-2 mt-1">
                        {data.payoutEntries.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <span className="text-sm text-gray-500 w-10 shrink-0">{entry.label}</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={entry.pct}
                                    onChange={e => handlePctChange(idx, e.target.value)}
                                    disabled={data.payoutPreset !== "custom"}
                                    className={`w-24 px-2 py-1.5 rounded border text-sm text-right ${data.payoutPreset === "custom"
                                        ? "border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-400/40 focus:border-blue-500 outline-none"
                                        : "border-gray-200 bg-gray-50 text-gray-500"
                                        }`}
                                />
                                <span className="text-sm text-gray-400">%</span>
                                <span className="text-sm text-gray-600 ml-auto">
                                    {afterFee > 0 ? `≈ ${((entry.pct / 100) * afterFee).toFixed(2)} ${data.token}` : ""}
                                </span>
                                {data.payoutPreset === "custom" && (
                                    <button onClick={() => removeCustomRow(idx)} className="text-gray-400 hover:text-red-400 text-xs ml-1">✕</button>
                                )}
                            </div>
                        ))}
                        {data.payoutPreset === "custom" && (
                            <button
                                onClick={addCustomRow}
                                className="text-xs text-blue-600 hover:text-blue-700 self-start mt-1"
                            >
                                + Add placement
                            </button>
                        )}
                    </div>

                    {data.payoutPreset === "custom" && pctSum !== 100 && (
                        <p className={`text-xs font-medium ${pctSum > 100 ? "text-red-500" : "text-amber-500"}`}>
                            Percentages sum to {pctSum.toFixed(1)}% — must equal 100%
                        </p>
                    )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
                    <span className="font-semibold">Protocol fee:</span> 3.5% deducted from total prize pool at payout time. Prize amounts shown above are after-fee estimates.
                </div>
            </div>

            {/* Live preview */}
            <div className="lg:sticky lg:top-6 h-fit">
                <div className="bg-[#0a1929] text-white rounded-xl p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-semibold text-gray-300">Prize Pool Preview</span>
                    </div>

                    <div className="text-4xl font-bold text-white">
                        {pool.toFixed(2)} <span className="text-lg font-normal text-gray-400">{data.token}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs text-gray-400 border-t border-white/10 pt-3">
                        <div className="flex justify-between">
                            <span>Organizer deposit</span>
                            <span className="text-white">{parseFloat(data.deposit) || 0} {data.token}</span>
                        </div>
                        {!detailsData.freeEntry && (
                            <div className="flex justify-between">
                                <span>Entry fees ({detailsData.maxParticipants} × {parseFloat(detailsData.entryFee) || 0})</span>
                                <span className="text-white">{((parseFloat(detailsData.entryFee) || 0) * detailsData.maxParticipants).toFixed(2)} {data.token}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-white/10 pt-1.5 text-red-400">
                            <span>Protocol fee (3.5%)</span>
                            <span>−{(pool * PROTOCOL_FEE).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-green-400 text-sm pt-0.5">
                            <span>Net to winners</span>
                            <span>{afterFee.toFixed(2)} {data.token}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 border-t border-white/10 pt-3">
                        {data.payoutEntries.map((e, i) => (
                            <div key={i} className="flex justify-between text-xs">
                                <span className="text-gray-400">{e.label} — {e.pct}%</span>
                                <span className="text-white font-medium">
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