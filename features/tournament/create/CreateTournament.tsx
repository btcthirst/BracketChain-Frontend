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
    if (!Number.isFinite(n) || n < 0) return 0n;
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

        const entryFeeMicro = detailsData.freeEntry ? 0n : microUsdcFromUsd(detailsData.entryFee);
        const deadlineSec = unixSecondsFromForm(detailsData.startDate, detailsData.startTime);

        setTxState("signing");
        try {
            const result = await createTournament(client, {
                name: detailsData.name.trim(),
                entryFee: entryFeeMicro,
                maxParticipants: detailsData.maxParticipants,
                payoutPreset: presetVariant,
                registrationDeadline: deadlineSec,
            });

            setTournamentAddress(result.tournamentPda.toBase58());
            setTxSignature(result.txSignature);
            setTxState("success");
        } catch (err) {
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-6 py-4 flex items-center gap-4">
                    <a
                        href={ROUTES.home}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm"
                    >
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
                    <div className="flex justify-between mt-10 pt-6 border-t border-gray-200">
                        <button
                            onClick={step === 0 ? () => router.push("/") : handleBack}
                            disabled={txState === "signing" || txState === "pending"}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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