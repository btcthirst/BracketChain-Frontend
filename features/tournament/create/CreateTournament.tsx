"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/links";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { MotionDiv } from "@/components/ui/motion-wraper";
import { PAYOUT_PRESETS } from "../utils/constants";
import { validateStep1 } from "../steps/ValidateState";
import { DetailsStep } from "../steps/DetailsStep";
import { PrizeStep } from "../steps/PrizeStep";
import { ConfirmStep } from "../steps/ConfirmStep";
import { Stepper } from "../steps/Stepper";
import { DetailsData, PrizeData, TxState } from "../utils/types";


export function CreateTournament() {
    const router = useRouter();
    const { connected } = useWallet();
    const { setVisible } = useWalletModal();

    const [step, setStep] = useState(0);
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