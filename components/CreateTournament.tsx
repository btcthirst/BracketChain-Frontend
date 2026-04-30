"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/links";
import { ChevronRight, ChevronLeft, Trophy, Loader2, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";
import { MotionDiv } from "@/components/ui/motion-wraper";

// ─── Types ──────────────────────────────────────────────────────────────────

type Format = "SE" | "DE" | "Swiss" | "RR";
type Token = "USDC" | "SOL" | "custom";
type PayoutPreset = "wta" | "standard" | "deep" | "custom";

interface Step1Data {
    name: string;
    format: Format;
    maxParticipants: 4 | 8 | 16 | 32 | 64 | 128;
    startDate: string;
    startTime: string;
    freeEntry: boolean;
    entryFee: string;
}

interface PayoutEntry { place: number; label: string; pct: number }

interface Step2Data {
    token: Token;
    customToken: string;
    deposit: string;
    payoutPreset: PayoutPreset;
    payoutEntries: PayoutEntry[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FORMAT_INFO: Record<Format, { label: string; desc: string }> = {
    SE: { label: "Single Elimination", desc: "One loss and you're out. Fast-paced, great for large fields." },
    DE: { label: "Double Elimination", desc: "Players get a second chance via the losers bracket. Fairer outcome." },
    Swiss: { label: "Swiss System", desc: "All players play every round; matched by record. No eliminations." },
    RR: { label: "Round Robin", desc: "Everyone plays everyone. Best overall record wins. Ideal for small groups." },
};

const PAYOUT_PRESETS: Record<PayoutPreset, { label: string; entries: PayoutEntry[] }> = {
    wta: {
        label: "Winner Takes All",
        entries: [{ place: 1, label: "1st", pct: 100 }],
    },
    standard: {
        label: "Standard 60/25/15",
        entries: [
            { place: 1, label: "1st", pct: 60 },
            { place: 2, label: "2nd", pct: 25 },
            { place: 3, label: "3rd", pct: 15 },
        ],
    },
    deep: {
        label: "Deep 40/25/15/10/5/3/2",
        entries: [
            { place: 1, label: "1st", pct: 40 },
            { place: 2, label: "2nd", pct: 25 },
            { place: 3, label: "3rd", pct: 15 },
            { place: 4, label: "4th", pct: 10 },
            { place: 5, label: "5th", pct: 5 },
            { place: 6, label: "6th", pct: 3 },
            { place: 7, label: "7th", pct: 2 },
        ],
    },
    custom: {
        label: "Custom",
        entries: [
            { place: 1, label: "1st", pct: 70 },
            { place: 2, label: "2nd", pct: 30 },
        ],
    },
};

const PROTOCOL_FEE = 0.035;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function totalPool(deposit: string, fee: string, max: number, freeEntry: boolean): number {
    const d = parseFloat(deposit) || 0;
    const f = freeEntry ? 0 : (parseFloat(fee) || 0);
    return d + f * max;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
    const steps = ["Details", "Prize Pool", "Confirm"];
    return (
        <div className="flex items-center gap-0 mb-10">
            {steps.map((label, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <div key={i} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ${done
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : active
                                            ? "bg-white border-blue-600 text-blue-600"
                                            : "bg-white border-gray-300 text-gray-400"
                                    }`}
                            >
                                {done ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                            </div>
                            <span className={`text-xs font-medium ${active ? "text-blue-600" : done ? "text-gray-700" : "text-gray-400"}`}>
                                {label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`h-0.5 w-16 mx-2 mb-5 transition-all duration-500 ${done ? "bg-blue-600" : "bg-gray-200"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function FieldGroup({ label, hint, children, error }: { label: string; hint?: string; children: React.ReactNode; error?: string }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-800">{label}</label>
            {children}
            {hint && !error && <p className="text-xs text-gray-500 leading-relaxed">{hint}</p>}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

function inputCls(error?: string) {
    return `w-full px-3 py-2.5 rounded-lg border text-sm bg-white text-gray-900 transition-colors outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 ${error ? "border-red-400" : "border-gray-300 hover:border-gray-400"}`;
}

// ─── Step 1: Details ─────────────────────────────────────────────────────────

function Step1({ data, onChange, errors }: { data: Step1Data; onChange: (d: Partial<Step1Data>) => void; errors: Partial<Record<keyof Step1Data, string>> }) {
    const today = new Date().toISOString().split("T")[0];

    return (
        <div className="flex flex-col gap-6">
            <FieldGroup
                label="Tournament Name"
                hint="Choose a unique, memorable name. Up to 64 characters."
                error={errors.name}
            >
                <div className="relative">
                    <input
                        className={inputCls(errors.name)}
                        maxLength={64}
                        placeholder="e.g. Spring Championship 2025"
                        value={data.name}
                        onChange={e => onChange({ name: e.target.value })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{data.name.length}/64</span>
                </div>
            </FieldGroup>

            <FieldGroup
                label="Format"
                hint={FORMAT_INFO[data.format].desc}
                error={errors.format}
            >
                <select
                    className={inputCls(errors.format)}
                    value={data.format}
                    onChange={e => onChange({ format: e.target.value as Format })}
                >
                    {(Object.entries(FORMAT_INFO) as [Format, { label: string }][]).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4">
                <FieldGroup
                    label="Max Participants"
                    hint="Brackets are filled first-come first-served."
                    error={errors.maxParticipants}
                >
                    <select
                        className={inputCls(errors.maxParticipants)}
                        value={data.maxParticipants}
                        onChange={e => onChange({ maxParticipants: Number(e.target.value) as Step1Data["maxParticipants"] })}
                    >
                        {[4, 8, 16, 32, 64, 128].map(n => (
                            <option key={n} value={n}>{n} players</option>
                        ))}
                    </select>
                </FieldGroup>

                <FieldGroup
                    label="Entry Fee (USD)"
                    hint={data.freeEntry ? "Free entry — open to all." : "Charged in the selected prize token."}
                    error={errors.entryFee}
                >
                    <div className="flex gap-2 items-center">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <div
                                onClick={() => onChange({ freeEntry: !data.freeEntry })}
                                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${data.freeEntry ? "bg-blue-600" : "bg-gray-300"}`}
                            >
                                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${data.freeEntry ? "translate-x-4.5 ml-0.5" : "ml-0.5"}`} />
                            </div>
                            <span className="text-xs text-gray-500">Free</span>
                        </label>
                        {!data.freeEntry && (
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className={inputCls(errors.entryFee) + " flex-1"}
                                placeholder="0.00"
                                value={data.entryFee}
                                onChange={e => onChange({ entryFee: e.target.value })}
                            />
                        )}
                    </div>
                </FieldGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="Start Date" hint="Must be a future date." error={errors.startDate}>
                    <input
                        type="date"
                        min={today}
                        className={inputCls(errors.startDate)}
                        value={data.startDate}
                        onChange={e => onChange({ startDate: e.target.value })}
                    />
                </FieldGroup>
                <FieldGroup label="Start Time (UTC)" error={errors.startTime}>
                    <input
                        type="time"
                        className={inputCls(errors.startTime)}
                        value={data.startTime}
                        onChange={e => onChange({ startTime: e.target.value })}
                    />
                </FieldGroup>
            </div>
        </div>
    );
}

// ─── Step 2: Prize Pool ───────────────────────────────────────────────────────

function Step2({
    data,
    step1,
    onChange,
    connected,
    onConnect,
}: {
    data: Step2Data;
    step1: Step1Data;
    onChange: (d: Partial<Step2Data>) => void;
    connected: boolean;
    onConnect: () => void;
}) {
    const pool = totalPool(data.deposit, step1.entryFee, step1.maxParticipants, step1.freeEntry);
    const afterFee = pool * (1 - PROTOCOL_FEE);
    const pctSum = data.payoutEntries.reduce((a, e) => a + e.pct, 0);

    function handlePreset(preset: PayoutPreset) {
        onChange({ payoutPreset: preset, payoutEntries: [...PAYOUT_PRESETS[preset].entries] });
    }

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
                        <option value="USDC">USDC</option>
                        <option value="SOL">SOL</option>
                        <option value="custom">Custom SPL token</option>
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">{data.token}</span>
                    </div>
                </FieldGroup>

                <div className="flex flex-col gap-3">
                    <span className="text-sm font-semibold text-gray-800">Payout Structure</span>
                    <div className="flex flex-wrap gap-2">
                        {(Object.entries(PAYOUT_PRESETS) as [PayoutPreset, { label: string }][]).map(([key, { label }]) => (
                            <button
                                key={key}
                                onClick={() => handlePreset(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${data.payoutPreset === key
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-white border-gray-300 text-gray-600 hover:border-blue-400"
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
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
                        {!step1.freeEntry && (
                            <div className="flex justify-between">
                                <span>Entry fees ({step1.maxParticipants} × {parseFloat(step1.entryFee) || 0})</span>
                                <span className="text-white">{((parseFloat(step1.entryFee) || 0) * step1.maxParticipants).toFixed(2)} {data.token}</span>
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

// ─── Step 3: Confirm ──────────────────────────────────────────────────────────

type TxState = "idle" | "signing" | "pending" | "success" | "error";

function Step3({
    step1,
    step2,
    onConfirm,
    txState,
    txError,
}: {
    step1: Step1Data;
    step2: Step2Data;
    onConfirm: () => void;
    txState: TxState;
    txError: string;
}) {
    const pool = totalPool(step2.deposit, step1.entryFee, step1.maxParticipants, step1.freeEntry);
    const cost = (parseFloat(step2.deposit) || 0) + 0.001;
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
        ["Name", step1.name || "—"],
        ["Format", FORMAT_INFO[step1.format].label],
        ["Max Participants", `${step1.maxParticipants} players`],
        ["Start", step1.startDate && step1.startTime ? `${step1.startDate} at ${step1.startTime} UTC` : "—"],
        ["Entry Fee", step1.freeEntry ? "Free" : `${step1.entryFee} ${step2.token}`],
        ["Prize Token", step2.token === "custom" ? step2.customToken || "Custom SPL" : step2.token],
        ["Prize Pool", `${pool.toFixed(2)} ${step2.token}`],
        ["Payout", PAYOUT_PRESETS[step2.payoutPreset].label],
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
                    <p className="text-2xl font-bold text-blue-900">{cost.toFixed(3)} {step2.token}</p>
                    <p className="text-xs text-blue-600 mt-1">
                        {parseFloat(step2.deposit) || 0} {step2.token} deposit + ~0.001 SOL transaction fee
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

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep1(d: Step1Data): Partial<Record<keyof Step1Data, string>> {
    const errs: Partial<Record<keyof Step1Data, string>> = {};
    if (!d.name.trim()) errs.name = "Tournament name is required.";
    if (d.name.length > 64) errs.name = "Name must be 64 characters or fewer.";
    if (!d.freeEntry && (isNaN(parseFloat(d.entryFee)) || parseFloat(d.entryFee) < 0))
        errs.entryFee = "Enter a valid entry fee.";
    if (!d.startDate) errs.startDate = "Select a start date.";
    if (!d.startTime) errs.startTime = "Select a start time.";
    if (d.startDate) {
        const dt = new Date(`${d.startDate}T${d.startTime || "00:00"}`);
        if (dt <= new Date()) errs.startDate = "Start date/time must be in the future.";
    }
    return errs;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CreateTournament() {
    const router = useRouter();
    const { connected } = useWallet();
    const { setVisible } = useWalletModal();

    const [step, setStep] = useState(0);
    const [step1, setStep1] = useState<Step1Data>({
        name: "",
        format: "SE",
        maxParticipants: 16,
        startDate: "",
        startTime: "",
        freeEntry: false,
        entryFee: "",
    });
    const [step2, setStep2] = useState<Step2Data>({
        token: "USDC",
        customToken: "",
        deposit: "",
        payoutPreset: "standard",
        payoutEntries: [...PAYOUT_PRESETS.standard.entries],
    });
    const [errors1, setErrors1] = useState<Partial<Record<keyof Step1Data, string>>>({});
    const [txState, setTxState] = useState<TxState>("idle");
    const [txError, setTxError] = useState("");

    const handleNext = useCallback(() => {
        if (step === 0) {
            const errs = validateStep1(step1);
            if (Object.keys(errs).length > 0) { setErrors1(errs); return; }
            setErrors1({});
        }
        setStep(s => s + 1);
    }, [step, step1]);

    const handleBack = () => {
        setTxError("");
        setStep(s => s - 1);
    };

    const handleConfirm = useCallback(async () => {
        setTxError("");
        setTxState("signing");
        // Simulate wallet signing delay
        await new Promise(r => setTimeout(r, 1500));
        setTxState("pending");
        // Simulate on-chain confirmation
        await new Promise(r => setTimeout(r, 2000));
        // Simulate random failure for demo (20% chance)
        if (Math.random() < 0.2) {
            setTxError("Transaction simulation failed: insufficient lamports for fee payment.");
            setTxState("error");
            return;
        }
        setTxState("success");
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-6 py-4 flex items-center gap-4">
                    <a href={ROUTES.home} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm">
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </a>
                    <div className="h-4 w-px bg-gray-300" />
                    <h1 className="text-xl font-bold text-gray-900">Create Tournament</h1>
                </div>
            </div>

            <div className="container mx-auto px-6 py-10 max-w-4xl">
                <Stepper current={step} />

                <MotionDiv
                    key={step}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    {step === 0 && (
                        <Step1
                            data={step1}
                            onChange={d => setStep1(s => ({ ...s, ...d }))}
                            errors={errors1}
                        />
                    )}
                    {step === 1 && (
                        <Step2
                            data={step2}
                            step1={step1}
                            onChange={d => setStep2(s => ({ ...s, ...d }))}
                            connected={connected}
                            onConnect={() => setVisible(true)}
                        />
                    )}
                    {step === 2 && (
                        <Step3
                            step1={step1}
                            step2={step2}
                            onConfirm={handleConfirm}
                            txState={txState}
                            txError={txError}
                        />
                    )}
                </MotionDiv>

                {/* Navigation */}
                {txState !== "success" && (
                    <div className="flex justify-between mt-10 pt-6 border-t border-gray-200">
                        <button
                            onClick={step === 0 ? () => router.push("/") : handleBack}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            {step === 0 ? "Cancel" : "Back"}
                        </button>
                        {step < 2 && (
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}