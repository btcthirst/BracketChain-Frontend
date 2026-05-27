// types/tournament.ts

// ── Primitives ────────────────────────────────────────────────────────────────

export type TournamentFormat = "SE" | "DE" | "Swiss" | "RR";
export type TournamentStatus = "registration" | "in_progress" | "completed" | "cancelled";
export type Token = "USDC" | "SOL" | "custom";
export type PayoutPreset = "wta" | "standard" | "deep" | "custom";
export type TxState = "idle" | "signing" | "pending" | "success" | "error";

// ── Stage B settlement ──────────────────────────────────────────────────────
// How a tournament's match results are settled (mirrors on-chain SettlementMode).
//   organizer_only  — only the organizer reports results (MVP flow).
//   player_reported — a match player proposes; the opponent confirms/disputes;
//                      anyone may claim past the dispute window.
//   oracle          — an oracle reporter proposes (UI deferred to a later wave).
export type SettlementMode = "organizer_only" | "player_reported" | "oracle";

// Origin of a pending result proposal (mirrors on-chain ProposalSource).
export type ProposalSource = "none" | "player" | "oracle" | "game_server";

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

// Stage B settlement envelope mirrored onto the UI match. Populated for both
// indexer and chain reads (the on-chain MatchNode carries these fields). When
// no proposal is live, `proposalSource` is "none" and the rest are empty.
export interface MatchSettlement {
    proposalSource: ProposalSource;
    // Wallet that authored the live proposal; null when none / default pubkey.
    proposer: string | null;
    // Winner asserted by the live proposal; null when none.
    proposedWinner: string | null;
    // ISO timestamp the proposal was recorded; null when none.
    proposedAt: string | null;
    // ISO deadline after which the result may be permissionlessly finalized.
    // Re-armed to +24h on dispute. null when no proposal is live.
    claimDeadline: string | null;
    disputed: boolean;
    // Raw dispute reason code; null when undisputed.
    disputeReason: number | null;
}

export interface Match {
    id: string;
    round: number;
    position: number;
    playerA: Player | null;
    playerB: Player | null;
    winner: Player | null;
    // UI lifecycle. pending_confirmation / disputed are derived from the
    // settlement envelope — on chain the match is still Active while a proposal
    // or dispute is open (see useTournamentView's matchUiStatus).
    status: "pending" | "in_progress" | "pending_confirmation" | "disputed" | "completed";
    settlement: MatchSettlement;
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
    // On-chain bracket-init progress. UI status `in_progress` covers both
    // PendingBracketInit and Active — `bracketReady` distinguishes them so the
    // organizer can't try to report results before all match PDAs exist.
    matchesInitialized: number;
    totalMatches: number;
    bracketReady: boolean;
    // Stage B: who may report results. Drives the report-modal flow
    // (organizer-report vs player-reported propose/confirm/dispute/claim).
    settlementMode: SettlementMode;
}