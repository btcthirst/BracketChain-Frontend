import { DetailsData } from "@/types/tournament";

export function validateStep1(d: DetailsData): Partial<Record<keyof DetailsData, string>> {
    const errs: Partial<Record<keyof DetailsData, string>> = {};
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