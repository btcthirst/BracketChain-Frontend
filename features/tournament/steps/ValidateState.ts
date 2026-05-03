import { DetailsData } from "@/types/tournament";

export function validateStep1(d: DetailsData): Partial<Record<keyof DetailsData, string>> {
    const errs: Partial<Record<keyof DetailsData, string>> = {};
    if (!d.name.trim()) errs.name = "Tournament name is required.";
    // Solana per-seed limit + program enforces ≤ 32 bytes. UTF-8 byte length
    // ≤ char count for ASCII; for multi-byte chars the SDK may still throw —
    // the client-side cap here is best-effort UX, not authoritative.
    if (d.name.length > 32) errs.name = "Name must be 32 characters or fewer.";
    if (!d.freeEntry && (isNaN(parseFloat(d.entryFee)) || parseFloat(d.entryFee) < 0))
        errs.entryFee = "Enter a valid entry fee.";
    if (!d.startDate) errs.startDate = "Select a registration close date.";
    if (!d.startTime) errs.startTime = "Select a registration close time.";
    if (d.startDate) {
        // Parse as UTC to match the on-chain conversion in CreateTournament.tsx
        // (`unixSecondsFromForm`). Without the `Z`, JS interprets the string as
        // local time — the gate would then drift from what the program enforces.
        const dt = new Date(`${d.startDate}T${d.startTime || "00:00"}:00Z`);
        // 60s buffer absorbs sysvar block-time drift + tx confirmation latency.
        // Without it, a deadline 2s in the future passes UI but the program
        // rejects with RegistrationClosed once the tx lands.
        if (dt.getTime() <= Date.now() + 60_000)
            errs.startDate = "Registration must close at least 1 minute from now.";
    }
    return errs;
}