"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/constants/links";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionDiv } from "@/components/ui/motion-wraper";
import { PAYOUT_PRESETS } from "@/constants/tournament";
import { validateStep1, validateStep2, type Step2Errors } from "../steps/ValidateState";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { DetailsStep } from "../steps/DetailsStep";
import { PrizeStep } from "../steps/PrizeStep";
import { ConfirmStep } from "../steps/ConfirmStep";
import { Stepper } from "../steps/Stepper";
import { DetailsData, PayoutPreset, PrizeData, TxState } from "@/types/tournament";
import { useBracketChainClient } from "@/lib/sdk";
import {
    BracketChainSDKError,
    InsufficientFundsError,
    InsufficientBalanceError,
    RegistrationClosedError,
    TournamentNameTakenError,
    NameTooLongError,
    InvalidPayoutPresetError,
    InvalidTokenMintError,
    ProtocolNotInitializedError,
    TransactionFailedError,
    UnknownProgramError,
    MaxParticipantsExceededError,
    MinParticipantsNotMetError,
    mapError,
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

// Map raw tx errors to user-friendly text. Raw `.message` from the program
// often reads like "RegistrationClosed: registration deadline passed" — fine
// for logs, but useless to a non-technical user. We branch on the typed SDK
// errors (defined in @bracketchain/sdk) and fall back to the raw message
// only when no specific case matches. `instanceof` survives minification —
// `constructor.name` would not.
function describeError(err: unknown): string {
    const sdkErr = err instanceof BracketChainSDKError ? err : mapError(err);

    if (sdkErr instanceof InsufficientFundsError || sdkErr instanceof InsufficientBalanceError) {
        return "Your wallet doesn't have enough USDC to fund this deposit. Top up the connected wallet and try again.";
    }
    if (sdkErr instanceof RegistrationClosedError) {
        return "Registration deadline passed before the transaction landed. Pick a deadline a few minutes further out.";
    }
    if (sdkErr instanceof TournamentNameTakenError) {
        return "You already have a tournament with this name. Choose a different name.";
    }
    if (sdkErr instanceof NameTooLongError) {
        return "Tournament name exceeds the 32-byte on-chain limit. Shorten the name.";
    }
    if (sdkErr instanceof InvalidPayoutPresetError) {
        return "Selected payout preset isn't compatible with this participant count. Pick WTA, Standard, or Deep.";
    }
    if (sdkErr instanceof InvalidTokenMintError) {
        return "The selected prize token isn't accepted by the protocol. MVP supports USDC only.";
    }
    if (sdkErr instanceof ProtocolNotInitializedError) {
        return "BracketChain protocol isn't initialized on this cluster. Check your wallet's network.";
    }
    if (sdkErr instanceof MaxParticipantsExceededError) {
        return "Max participants exceeds the protocol cap. Pick a smaller bracket size.";
    }
    if (sdkErr instanceof MinParticipantsNotMetError) {
        return "Tournaments require at least 2 participants.";
    }
    if (sdkErr instanceof TransactionFailedError) {
        return "Transaction didn't confirm. Devnet congestion is common — try again in a moment.";
    }
    if (sdkErr instanceof UnknownProgramError) {
        return "On-chain check failed unexpectedly. Verify the cluster matches your wallet (devnet vs mainnet).";
    }

    return sdkErr.message || (err instanceof Error ? err.message : String(err));
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
    const [errors2, setErrors2] = useState<Step2Errors>({});
    const [txState, setTxState] = useState<TxState>("idle");
    const [txError, setTxError] = useState("");

    // Step 2 guard needs current wallet balance. PrizeStep already calls this
    // hook for its own warning UI; lifting it up here keeps a single source
    // of truth and avoids a second RPC poll.
    const { sol, usdc } = useWalletBalance();
    const balanceForToken = prizeData.token === "USDC" ? usdc
        : prizeData.token === "SOL" ? sol
        : null;

    const handleNext = useCallback(() => {
        if (step === 0) {
            const errs = validateStep1(detailsData);
            if (Object.keys(errs).length > 0) { setErrors1(errs); return; }
            setErrors1({});
        }
        if (step === 1) {
            const errs = validateStep2(prizeData, detailsData, balanceForToken);
            if (Object.keys(errs).length > 0) { setErrors2(errs); return; }
            setErrors2({});
        }
        setStep(s => s + 1);
    }, [step, detailsData, prizeData, balanceForToken]);

    const handleBack = () => {
        setTxError("");
        setStep(s => s - 1);
    };

    const handleConfirm = useCallback(async () => {
        setTxError("");

        if (!client) {
            const msg = "Connect your wallet first.";
            setTxError(msg);
            setTxState("error");
            toast.error(msg);
            return;
        }

        // MVP scope guards — defense-in-depth. ConfirmStep already disables the
        // Create button when these conditions hold, so reaching this point is
        // unexpected. We still toast so a forced click (devtools, automation)
        // surfaces a clear reason.
        if (detailsData.format !== "SE") {
            const msg = "Only Single Elimination is supported in MVP.";
            setTxError(msg);
            setTxState("error");
            toast.error(msg);
            return;
        }
        if (prizeData.token !== "USDC") {
            const msg = "Only USDC is supported in MVP.";
            setTxError(msg);
            setTxState("error");
            toast.error(msg);
            return;
        }

        let presetVariant: PayoutPresetVariant;
        try {
            presetVariant = buildPayoutPresetVariant(prizeData.payoutPreset);
        } catch (err) {
            const msg = describeError(err);
            setTxError(msg);
            setTxState("error");
            toast.error(msg);
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
            toast.success("Tournament created on-chain!");
        } catch (err) {
            const msg = describeError(err);
            // Wallet-rejected cases shouldn't read as a hard failure. Sonner's
            // info variant matches the convention used by Sidebar for the same
            // event ("Request cancelled").
            if (msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("user rejected")) {
                toast.info("Request cancelled");
            } else {
                toast.error(msg);
            }
            setTxError(msg);
            setTxState("error");
            console.error("CreateTournament failed:", err);
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
                            onChange={d => {
                                setPrizeData(s => ({ ...s, ...d }));
                                // Clear errors as user edits — same UX as Step 1.
                                if (Object.keys(errors2).length > 0) setErrors2({});
                            }}
                            connected={connected}
                            onConnect={() => setVisible(true)}
                            errors={errors2}
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
                        <Button
                            variant="ghost"
                            disabled={isProcessing}
                            onClick={step === 0 ? () => router.push("/") : handleBack}
                        >
                            <ChevronLeft className="size-[15px]" />
                            {step === 0 ? "Cancel" : "Back"}
                        </Button>
                        {step < 2 && (
                            <Button variant="primary" onClick={handleNext}>
                                Next
                                <ChevronRight className="size-[15px]" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}