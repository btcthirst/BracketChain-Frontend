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

// UI-level settlement choice — mirrors SDK's SettlementMode but stays as a
// literal here so the form can hold it without importing the SDK enum.
export type UISettlementChoice = "organizer_only" | "player_reported" | "oracle";

// UI-level game choice — Phase 1 supports Manual only in the create form
// (Dota 2 needs a SAS attestation flow; CS2/Valorant/LoL aren't yet on chain).
// The picker shows all values but only `manual` is enabled.
export type UIGameChoice = "manual" | "dota2" | "cs2faceit" | "valorant" | "lol";

// UI-level arbitrator choice — V1.2 fixes arbitrator = organizer on chain;
// Squads / custom are V1.3 reassignment options surfaced as locked previews.
export type UIArbitratorChoice = "organizer" | "squads" | "custom";

export interface DetailsData {
    name: string;
    format: TournamentFormat;
    maxParticipants: 2 | 4 | 8 | 16 | 32 | 64 | 128;
    /** ISO-local datetime ("YYYY-MM-DDTHH:MM") from a single <input type="datetime-local">. */
    startAt: string;
    /** Empty string or "0" means free entry. Non-zero positive → charged. */
    entryFee: string;
    settlementMode: UISettlementChoice;
    game: UIGameChoice;
    arbitrator: UIArbitratorChoice;
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

// Stage C (V1.2 Oracle settlement) — pre-match commitment + feed binding.
// Populated only for Oracle-mode matches once `commit_match_lobby` /
// `bind_match_feed` have fired. All fields null until then; everything stays
// null on OrganizerOnly / PlayerReported matches.
export interface MatchOracleCommit {
    // 32-byte lowercase hex; matches what is pasted into the Dota 2 lobby name.
    lobbyId: string | null;
    // ISO timestamp of the `commit_match_lobby` tx.
    committedAt: string | null;
    // 32-byte SHA-256 of player A's identity at commit time (lowercase hex).
    // Populated by the chain-read path / reconciliation cron — webhook events
    // don't carry it. Useful for the OraclePendingPanel audit display.
    playerAGameId: string | null;
    playerBGameId: string | null;
    // 32-byte SHA-256 of the OracleJob schema; bound feed's `feed_hash` must
    // equal this (Layer-1 anti-redirection — see MatchCommitment docs).
    expectedFeedHash: string | null;
    // Switchboard PullFeed PDA bound to this match (base58); null = unbound.
    switchboardFeed: string | null;
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
    // Stage C: Oracle commit/bind state. Always present (fields default to null);
    // panels read it to decide whether to render commit/bind UI vs awaiting feed
    // vs the OraclePendingPanel.
    oracle: MatchOracleCommit;
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
    // Stage C: wallet authorized to resolve disputed Oracle proposals.
    // Defaults to the organizer at create-time. Surfaced in dispute UI so
    // players know who can force a resolution. Null on pre-V1.2 indexer rows
    // that haven't been reconciled yet.
    arbitrator: string | null;
}