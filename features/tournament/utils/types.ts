export type Format = "SE" | "DE" | "Swiss" | "RR";
export type Token = "USDC" | "SOL" | "custom";
export type PayoutPreset = "wta" | "standard" | "deep" | "custom";

export type TxState = "idle" | "signing" | "pending" | "success" | "error";

export interface DetailsData {
    name: string;
    format: Format;
    maxParticipants: 4 | 8 | 16 | 32 | 64 | 128;
    startDate: string;
    startTime: string;
    freeEntry: boolean;
    entryFee: string;
}

export interface PayoutEntry { place: number; label: string; pct: number }

export interface PrizeData {
    token: Token;
    customToken: string;
    deposit: string;
    payoutPreset: PayoutPreset;
    payoutEntries: PayoutEntry[];
}
