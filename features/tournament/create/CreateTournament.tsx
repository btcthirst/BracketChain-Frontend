"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/links";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { MotionDiv } from "@/components/ui/motion-wraper";
import { PAYOUT_PRESETS } from "@/constants/tournament";
import { validateStep1 } from "../steps/ValidateState";
import { DetailsStep } from "../steps/DetailsStep";
import { PrizeStep } from "../steps/PrizeStep";
import { ConfirmStep } from "../steps/ConfirmStep";
import { Stepper } from "../steps/Stepper";
import { DetailsData, PayoutPreset, PrizeData, TxState } from "@/types/tournament";
import { useBracketChainClient } from "@/lib/sdk";
import {
    BracketChainSDKError,
    createTournament,
    payoutPreset,
    type PayoutPresetVariant,
} from "@bracketchain/sdk";

const USDC_DECIMALS = 1_000_000;

const PAYOUT_PRESET_MAP: Record<Exclude<PayoutPreset, "custom">, Parameters<typeof payoutPreset>[0]> = {
    wta: "winnerTakesAll",
    standard: "standard",
    deep: "deep",
};

function buildPayoutPresetVariant(preset: PayoutPreset): PayoutPresetVariant {
    if (preset === "custom") {
        throw new Error("Custom payout presets are not supported in MVP. Choose WTA, Standard, or Deep.");
    }
    return payoutPreset(PAYOUT_PRESET_MAP[preset]);
}

function microUsdcFromUsd(amount: string): bigint {
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n < 0) return BigInt(0);
    return BigInt(Math.round(n * USDC_DECIMALS));
}

function unixSecondsFromForm(date: string, time: string): number {
    return Math.floor(new Date(`${date}T${time}:00Z`).getTime() / 1000);
}

function describeError(err: unknown): string {
    if (err instanceof BracketChainSDKError) return err.message;
    if (err instanceof Error) return err.message;
    return String(err);
}

export function CreateTournament() {
    const router = useRouter();
    const { connected } = useWallet();
    const { setVisible } = useWalletModal();
    const client = useBracketChainClient();

    const [step, setStep] = useState(0);
    const [tournamentAddress, setTournamentAddress] = useState<string | null>(null);
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [detailsData, setDetailsData] = useState<DetailsData>({
        name: "",
        format: "SE",
        maxParticipants: 16,
        startDate: "",
        startTime: "",
        freeEntry: false,
        entryFee: "",
    });
    const [prizeData, setPrizeData] = useState<PrizeData>({
        token: "USDC",
        customToken: "",
        deposit: "",
        payoutPreset: "standard",
        payoutEntries: [...PAYOUT_PRESETS.standard.entries],
    });
    const [errors1, setErrors1] = useState<Partial<Record<keyof DetailsData, string>>>({});
    const [txState, setTxState] = useState<TxState>("idle");
    const [txError, setTxError] = useState("");

    const handleNext = useCallback(() => {
        if (step === 0) {
            const errs = validateStep1(detailsData);
            if (Object.keys(errs).length > 0) { setErrors1(errs); return; }
            setErrors1({});
        }
        setStep(s => s + 1);
    }, [step, detailsData]);

    const handleBack = () => {
        setTxError("");
        setStep(s => s - 1);
    };

    const handleConfirm = useCallback(async () => {
        setTxError("");

        if (!client) {
            setTxError("Connect your wallet first.");
            setTxState("error");
            return;
        }

        // MVP scope guards — UI still exposes options the program rejects.
        if (detailsData.format !== "SE") {
            setTxError("Only Single Elimination is supported in MVP.");
            setTxState("error");
            return;
        }
        if (prizeData.token !== "USDC") {
            setTxError("Only USDC is supported in MVP.");
            setTxState("error");
            return;
        }

        let presetVariant: PayoutPresetVariant;
        try {
            presetVariant = buildPayoutPresetVariant(prizeData.payoutPreset);
        } catch (err) {
            setTxError(describeError(err));
            setTxState("error");
            return;
        }

        const entryFeeMicro = detailsData.freeEntry ? BigInt(0) : microUsdcFromUsd(detailsData.entryFee);
        const organizerDepositMicro = microUsdcFromUsd(prizeData.deposit);
        const deadlineSec = unixSecondsFromForm(detailsData.startDate, detailsData.startTime);

        setTxState("signing");
        try {
            const result = await createTournament(client, {
                name: detailsData.name.trim(),
                entryFee: entryFeeMicro,
                maxParticipants: detailsData.maxParticipants,
                payoutPreset: presetVariant,
                registrationDeadline: deadlineSec,
                // Phase 2.5: optional top-up to the prize pool. The SDK
                // auto-creates the organizer's USDC ATA if missing and folds
                // the transfer into the same tx. `0` is allowed (no deposit).
                organizerDeposit: organizerDepositMicro,
            });

            setTournamentAddress(result.tournamentPda.toBase58());
            setTxSignature(result.txSignature);
            setTxState("success");
        } catch (err) {
            console.log(err);
            setTxError(describeError(err));
            setTxState("error");
        }
    }, [client, detailsData, prizeData]);

    // Reset tx state so user can try again cleanly
    const handleRetry = useCallback(() => {
        setTxState("idle");
        setTxError("");
        setTournamentAddress(null);
        setTxSignature(null);
    }, []);

    const isProcessing = txState === "signing" || txState === "pending";

    return (
        <div style={{ minHeight: "100vh", background: "transparent" }}>
            {/* Header */}
            <div
                style={{
                    background: "rgba(6,7,11,0.85)",
                    backdropFilter: "blur(16px)",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    position: "sticky",
                    top: 0,
                    zIndex: 40,
                }}
            >
                <div
                    style={{
                        maxWidth: 880,
                        margin: "0 auto",
                        padding: "0 24px",
                        height: 56,
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                    }}
                >
                    <a
                        href={ROUTES.home}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            color: "rgba(240,241,245,0.4)",
                            fontSize: "0.85rem",
                            textDecoration: "none",
                            transition: "color 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.8)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.4)"; }}
                    >
                        <ChevronLeft size={15} />
                        Back
                    </a>
                    <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
                    <h1
                        style={{
                            fontFamily: "'Syne', sans-serif",
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            color: "#f0f1f5",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        Create Tournament
                    </h1>
                </div>
            </div>

            <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px" }}>
                <Stepper current={step} />

                <MotionDiv
                    key={step}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    {step === 0 && (
                        <DetailsStep
                            data={detailsData}
                            onChange={d => setDetailsData(s => ({ ...s, ...d }))}
                            errors={errors1}
                        />
                    )}
                    {step === 1 && (
                        <PrizeStep
                            data={prizeData}
                            detailsData={detailsData}
                            onChange={d => setPrizeData(s => ({ ...s, ...d }))}
                            connected={connected}
                            onConnect={() => setVisible(true)}
                        />
                    )}
                    {step === 2 && (
                        <ConfirmStep
                            detailsData={detailsData}
                            prizeData={prizeData}
                            onConfirm={handleConfirm}
                            onRetry={handleRetry}
                            txState={txState}
                            txError={txError}
                            tournamentAddress={tournamentAddress}
                            txSignature={txSignature}
                        />
                    )}
                </MotionDiv>

                {/* Navigation */}
                {txState !== "success" && (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: 40,
                            paddingTop: 24,
                            borderTop: "1px solid rgba(255,255,255,0.07)",
                        }}
                    >
                        <button
                            onClick={step === 0 ? () => router.push("/") : handleBack}
                            disabled={isProcessing}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                background: "transparent",
                                border: "none",
                                color: "rgba(240,241,245,0.45)",
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                cursor: isProcessing ? "not-allowed" : "pointer",
                                opacity: isProcessing ? 0.4 : 1,
                                transition: "color 0.15s",
                                fontFamily: "'Inter', sans-serif",
                            }}
                            onMouseEnter={(e) => { if (!isProcessing) e.currentTarget.style.color = "rgba(240,241,245,0.85)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.45)"; }}
                        >
                            <ChevronLeft size={15} />
                            {step === 0 ? "Cancel" : "Back"}
                        </button>
                        {step < 2 && (
                            <button
                                onClick={handleNext}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 7,
                                    padding: "10px 22px",
                                    background: "#22d47e",
                                    color: "#06070b",
                                    border: "none",
                                    borderRadius: 8,
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 700,
                                    fontSize: "0.875rem",
                                    cursor: "pointer",
                                    transition: "background 0.15s, box-shadow 0.15s",
                                    boxShadow: "0 0 18px rgba(34,212,126,0.28)",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#16c062";
                                    e.currentTarget.style.boxShadow = "0 0 28px rgba(34,212,126,0.48)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#22d47e";
                                    e.currentTarget.style.boxShadow = "0 0 18px rgba(34,212,126,0.28)";
                                }}
                            >
                                Next
                                <ChevronRight size={15} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}