import { Format, PayoutEntry, PayoutPreset } from "./types";

export const PROTOCOL_FEE = 0.035;

// ─── Constants ───────────────────────────────────────────────────────────────

export const FORMAT_INFO: Record<Format, { label: string; desc: string }> = {
    SE: { label: "Single Elimination", desc: "One loss and you're out. Fast-paced, great for large fields." },
    DE: { label: "Double Elimination", desc: "Players get a second chance via the losers bracket. Fairer outcome." },
    Swiss: { label: "Swiss System", desc: "All players play every round; matched by record. No eliminations." },
    RR: { label: "Round Robin", desc: "Everyone plays everyone. Best overall record wins. Ideal for small groups." },
};

export const PAYOUT_PRESETS: Record<PayoutPreset, { label: string; entries: PayoutEntry[] }> = {
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

