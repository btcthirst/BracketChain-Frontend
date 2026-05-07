// types/tournament.ts

// ── Primitives ────────────────────────────────────────────────────────────────

export type TournamentFormat = "SE" | "DE" | "Swiss" | "RR";
export type TournamentStatus = "registration" | "in_progress" | "completed" | "cancelled";
export type Token = "USDC" | "SOL" | "custom";
export type PayoutPreset = "wta" | "standard" | "deep" | "custom";
export type TxState = "idle" | "signing" | "pending" | "success" | "error";

// ── Create flow ───────────────────────────────────────────────────────────────

export interface DetailsData {
    name: string;
    format: TournamentFormat;
    maxParticipants: 2 | 4 | 8 | 16 | 32 | 64 | 128;
    startDate: string;
    startTime: string;
    freeEntry: boolean;
    entryFee: string;
}

export interface PayoutEntry {
    place: number;
    label: string;
    pct: number;
}

export interface PrizeData {
    token: Token;
    customToken: string;
    deposit: string;
    payoutPreset: PayoutPreset;
    payoutEntries: PayoutEntry[];
}

// ── List / summary ────────────────────────────────────────────────────────────

export interface TournamentSummary {
    id: string;
    name: string;
    game: string;
    format: TournamentFormat;
    status: TournamentStatus;
    prizePool: number;
    token: string;
    participants: number;
    maxParticipants: number;
    startsIn: string;
}

// ── Detail view ───────────────────────────────────────────────────────────────

export interface Player {
    address: string;
    display: string;
    isOrganizer: boolean;
}

export interface MatchResult {
    scoreA: number;
    scoreB: number;
    txSignature: string;
    timestamp: string;
}

export interface Match {
    id: string;
    round: number;
    position: number;
    playerA: Player | null;
    playerB: Player | null;
    winner: Player | null;
    status: "pending" | "in_progress" | "completed";
    result: MatchResult | null;
}

export interface PayoutDistribution {
    place: number;
    label: string;
    pct: number;
    amount: number;
    recipient: Player | null;
    txSignature: string | null;
}

export interface TournamentView extends Omit<TournamentSummary, "participants" | "startsIn"> {
    entryFee: number;
    participants: Player[];
    matches: Match[];
    payouts: PayoutDistribution[];
    organizer: Player;
    startTime: string;
    registrationDeadline: string;
    cancelledTxSignature: string | null;
    refundTxSignatures: string[];
    matchesInitialized: number;
    totalMatches: number;
    bracketReady: boolean;
}