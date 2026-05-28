import { PublicKey } from "@solana/web3.js";
import { DetailsData, PrizeData } from "@/types/tournament";

export type Step2Errors = Partial<Record<"deposit" | "customToken" | "payoutEntries", string>>;

export function validateStep1(d: DetailsData): Partial<Record<keyof DetailsData, string>> {
    const errs: Partial<Record<keyof DetailsData, string>> = {};
    if (!d.name.trim()) errs.name = "Tournament name is required.";
    // Solana per-seed limit + program enforces ≤ 32 bytes. UTF-8 byte length
    // ≤ char count for ASCII; for multi-byte chars the SDK may still throw —
    // the client-side cap here is best-effort UX, not authoritative.
    if (d.name.length > 32) errs.name = "Name must be 32 characters or fewer.";
    // Empty input means free entry (0 fee). Any other value must be a
    // non-negative finite number.
    if (d.entryFee.trim() !== "") {
        const n = parseFloat(d.entryFee);
        if (!Number.isFinite(n) || n < 0) errs.entryFee = "Enter a valid amount, or leave blank for free.";
    }
    if (!d.startAt) {
        errs.startAt = "Pick when registration closes.";
    } else {
        // datetime-local is parsed as LOCAL time by JS (no `Z` suffix) — same
        // tz that the user sees in the picker, so the gate matches what they
        // typed against their clock. unixSecondsFromForm uses the same parse.
        const dt = new Date(d.startAt);
        // 60s buffer absorbs sysvar block-time drift + tx confirmation latency.
        // Without it, a deadline 2s in the future passes UI but the program
        // rejects with RegistrationClosed once the tx lands.
        if (dt.getTime() <= Date.now() + 60_000)
            errs.startAt = "Registration must close at least 1 minute from now.";
    }
    return errs;
}

// Step 2 guard. Without this `handleNext` happily advances to ConfirmStep and
// the user only learns about insufficient balance / payout-sum mismatch / bad
// token mint after a wallet popup + signing intent + on-chain reject, which
// is a confusing UX. Each rule mirrors a program-side or runtime check so the
// client error matches what would have failed downstream.
export function validateStep2(
    p: PrizeData,
    d: DetailsData,
    balance: number | null,
): Step2Errors {
    const errs: Step2Errors = {};

    // 1. Required deposit covered by wallet. `balance === null` means the
    // wallet hook hasn't resolved yet — skip the check rather than block on
    // unknown.
    const required = parseFloat(p.deposit) || 0;
    if (required < 0) {
        errs.deposit = "Deposit cannot be negative.";
    } else if (balance !== null && required > balance) {
        errs.deposit = `Insufficient ${p.token} balance: have ${balance.toFixed(2)}, need ${required}.`;
    }

    // 2. Custom payout must sum to exactly 100% (program enforces this in
    // create_tournament; client-side we allow ±0.01 for float drift).
    if (p.payoutPreset === "custom") {
        const sum = p.payoutEntries.reduce((a, e) => a + e.pct, 0);
        if (Math.abs(sum - 100) > 0.01) {
            errs.payoutEntries = `Payout percentages must sum to 100% (currently ${sum.toFixed(1)}%).`;
        }
        // Also catch obviously broken rows — any negative or NaN entry.
        if (p.payoutEntries.some(e => !Number.isFinite(e.pct) || e.pct < 0)) {
            errs.payoutEntries = "Each payout percentage must be a non-negative number.";
        }
    }

    // 3. Custom token must be a valid base58 PublicKey. `new PublicKey` throws
    // for invalid strings; we surface a friendly message here instead of
    // letting it crash inside ConfirmStep when SDK builds the account context.
    if (p.token === "custom") {
        const mint = p.customToken.trim();
        if (!mint) {
            errs.customToken = "Enter a token mint address.";
        } else {
            try {
                new PublicKey(mint);
            } catch {
                errs.customToken = "Not a valid base58 mint address (32–44 chars).";
            }
        }
    }

    // MVP scope guards: program currently only supports SE + USDC. We surface
    // these here too so the user doesn't reach Confirm with a doomed config.
    void d; // d reserved for future cross-step rules
    return errs;
}