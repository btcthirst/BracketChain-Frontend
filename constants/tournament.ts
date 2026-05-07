import type { TournamentFormat, PayoutEntry, PayoutPreset, Token } from "@/types/tournament";

// ── Protocol ──────────────────────────────────────────────────────────────────

export const PROTOCOL_FEE = 0.035;

// ── Format descriptions ───────────────────────────────────────────────────────
export const FORMAT_INFO: Record<
    TournamentFormat,
    { label: string; desc: string; available: boolean }
> = {
    SE: {
        label: "Single Elimination",
        desc: "One loss and you're out. Fast-paced, great for large fields.",
        available: true,
    },
    DE: {
        label: "Double Elimination (V1)",
        desc: "Coming in V1 — needs a separate losers-bracket state machine on-chain.",
        available: false,
    },
    Swiss: {
        label: "Swiss System (V1)",
        desc: "Coming in V1 — needs round-by-round pairing engine, no elimination tree.",
        available: false,
    },
    RR: {
        label: "Round Robin (V1)",
        desc: "Coming in V1 — N×(N−1)/2 match topology, separate champion-derivation logic.",
        available: false,
    },
};

// ── Payout presets ────────────────────────────────────────────────────────────
export const PAYOUT_PRESETS: Record<
    PayoutPreset,
    { label: string; entries: PayoutEntry[]; available: boolean; minParticipants: number }
> = {
    wta: {
        label: "Winner Takes All",
        entries: [{ place: 1, label: "1st", pct: 100 }],
        available: true,
        minParticipants: 1,
    },
    standard: {
        label: "Standard 60/25/15",
        entries: [
            { place: 1, label: "1st", pct: 60 },
            { place: 2, label: "2nd", pct: 25 },
            { place: 3, label: "3rd", pct: 15 },
        ],
        available: true,
        minParticipants: 3,
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
        available: true,
        minParticipants: 7,
    },
    custom: {
        label: "Custom (V2)",
        entries: [
            { place: 1, label: "1st", pct: 70 },
            { place: 2, label: "2nd", pct: 30 },
        ],
        available: false,
        minParticipants: 1,
    },
};

// ── Prize tokens ──────────────────────────────────────────────────────────────
export const TOKEN_INFO: Record<Token, { label: string; available: boolean }> = {
    USDC: { label: "USDC", available: true },
    SOL: { label: "wSOL (V1)", available: false },
    custom: { label: "Custom SPL token (V1)", available: false },
};