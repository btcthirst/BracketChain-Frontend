import { address, none, some, type Address } from "@solana/kit";
import {
    findMatchPda,
    findParticipantPda,
    findVaultPda,
    IndexerMatch,
    IndexerParticipant,
    IndexerTournament,
    MatchStatus,
    PayoutPreset,
    ProposalSource,
    SettlementMode,
    SupportedGame,
    TournamentFormat,
    TournamentStatus,
    type MatchNode,
    type MatchNodeWithAddress,
    type Participant,
    type ParticipantWithAddress,
    type Tournament,
    type TournamentState,
} from "@bracketchain/sdk";

const INDEXER_STATUS_TO_KIND: Record<IndexerTournament["status"], TournamentStatus> = {
    Registration: TournamentStatus.Registration,
    PendingBracketInit: TournamentStatus.PendingBracketInit,
    Active: TournamentStatus.Active,
    Completed: TournamentStatus.Completed,
    Cancelled: TournamentStatus.Cancelled,
    // Stage E mid-tournament cancel — terminal; maps to the generated enum's
    // Cancelled until the on-chain `PartialCancelled` variant lands in the
    // Stage F codama regen.
    PartialCancelled: TournamentStatus.Cancelled,
};

const INDEXER_PRESET_TO_KIND: Record<IndexerTournament["payoutPreset"], PayoutPreset> = {
    WinnerTakesAll: { __kind: "WinnerTakesAll" },
    Standard: { __kind: "Standard" },
    Deep: { __kind: "Deep" },
};

// The on-chain MatchNode.status only has three states. The indexer's
// PendingConfirmation / Disputed are derived from the settlement envelope and
// have no chain counterpart — on chain the match is still `Active` while a
// proposal/dispute is open. Collapse them to Active here; the 5-state UI
// status is re-derived from the envelope in useTournamentView's matchUiStatus.
const INDEXER_MATCH_STATUS: Record<IndexerMatch["status"], MatchStatus> = {
    Pending: MatchStatus.Pending,
    Active: MatchStatus.Active,
    PendingConfirmation: MatchStatus.Active,
    Disputed: MatchStatus.Active,
    Completed: MatchStatus.Completed,
};

const INDEXER_SETTLEMENT_TO_KIND: Record<
    NonNullable<IndexerTournament["settlementMode"]>,
    SettlementMode
> = {
    OrganizerOnly: SettlementMode.OrganizerOnly,
    PlayerReported: SettlementMode.PlayerReported,
    Oracle: SettlementMode.Oracle,
};

const INDEXER_GAME_TO_KIND: Record<
    NonNullable<IndexerTournament["game"]>,
    SupportedGame
> = {
    Manual: SupportedGame.Manual,
    Dota2: SupportedGame.Dota2,
    Cs2Faceit: SupportedGame.Cs2Faceit,
    Valorant: SupportedGame.Valorant,
    LoL: SupportedGame.LoL,
};

const INDEXER_PROPOSAL_TO_KIND: Record<
    IndexerMatch["proposalSource"],
    ProposalSource
> = {
    None: ProposalSource.None,
    Player: ProposalSource.Player,
    Oracle: ProposalSource.Oracle,
    GameServer: ProposalSource.GameServer,
};

const DEFAULT_ADDRESS = address("11111111111111111111111111111111");
const EMPTY_DISCRIMINATOR = new Uint8Array(8);
const EMPTY_IDENTITY_HASH = new Uint8Array(32);

function nextPow2(n: number): number {
    if (n <= 1) return 1;
    return 1 << Math.ceil(Math.log2(n));
}

function unixSecToBig(iso: string | null): bigint {
    if (!iso) return 0n;
    const sec = Math.floor(new Date(iso).getTime() / 1000);
    return BigInt(sec);
}

function bigFromString(s: string | null): bigint {
    if (s == null || s === "") return 0n;
    return BigInt(s);
}

function addrOrDefault(s: string | null): Address {
    if (!s) return DEFAULT_ADDRESS;
    try {
        return address(s);
    } catch {
        return DEFAULT_ADDRESS;
    }
}

// Indexer serializes `Bytes` columns as lowercase hex (see Indexer
// tournaments.controller serializeRow). Returns an empty Uint8Array on null;
// callers gate on the partner field to decide whether to render commit data.
function hexToBytes(hex: string | null, byteLen: number): Uint8Array {
    if (!hex) return new Uint8Array(byteLen);
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (clean.length !== byteLen * 2) return new Uint8Array(byteLen);
    const out = new Uint8Array(byteLen);
    for (let i = 0; i < byteLen; i++) {
        out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}

/**
 * Phase 5.3: convert (IndexerTournament + IndexerParticipant[] + IndexerMatch[])
 * into the SDK's `TournamentState` shape so the existing chain-shaped `buildView`
 * helper consumes it unchanged.
 *
 * Post-Stage-4 rewrite: emits Address-typed pubkeys, bigint amounts/timestamps,
 * and numeric-enum status values to match Codama account shapes. The PDA
 * helpers are async (kit returns Promise), so this fn is async too.
 *
 * Approximates fields the indexer doesn't carry (bracket_size,
 * matches_initialized, organizer_deposit_refunded, seed_hash) — see inline
 * notes for each.
 *
 * Trade-offs vs full chain reads:
 *  - `seed_hash` is empty (only used for randomness display, not by buildView)
 *  - `bumps` are zero (only used for SDK signing, not for read views)
 *  - `bracket_size` is derived as nextPow2(participantCount) for Active+
 *  - Pending/bye matches are absent — frontend's `bracketReady` flag
 *    correctly reads `false` until reconciliation cron (Phase 5.4) backfills
 *    them, OR until the chain-side reconcile in `useTournamentView` lands
 *
 * Frontend treats this as "good enough for first paint" — chain reconcile
 * arrives within a few hundred ms and replaces the view if anything diverges.
 */
export async function indexerToTournamentState(
    pda: Address,
    programAddress: Address,
    it: IndexerTournament,
    participants: IndexerParticipant[],
    matches: IndexerMatch[],
): Promise<TournamentState> {
    const statusKind = INDEXER_STATUS_TO_KIND[it.status];
    const presetKind = INDEXER_PRESET_TO_KIND[it.payoutPreset];

    const participantCount = participants.length;
    const isActiveOrTerminal =
        statusKind === TournamentStatus.Active ||
        statusKind === TournamentStatus.Completed ||
        statusKind === TournamentStatus.Cancelled;

    // Bracket size is fixed at start_tournament time on chain. The indexer
    // doesn't snapshot it. For Active+ tournaments it's nextPow2(participantCount);
    // for Registration/PendingBracketInit it's effectively unknown (defaults
    // to 0 — frontend uses `bracketReady` to gate, which correctly stays
    // false until Active).
    const bracketSize = isActiveOrTerminal ? nextPow2(participantCount) : 0;
    const totalMatches = bracketSize > 0 ? bracketSize - 1 : 0;
    const matchesInitialized = isActiveOrTerminal ? totalMatches : 0;
    const matchesReported = matches.filter((m) => m.status === "Completed").length;

    // organizer_deposit_refunded is on-chain only. Best-effort heuristic:
    // when status is Cancelled and there's no remaining deposit (organizer
    // has been refunded), set true. Without the chain account we approximate
    // by status alone — buildView only consults this when status === cancelled
    // anyway, and the chain-side reconcile arrives quickly to confirm.
    const organizerDepositRefunded = statusKind === TournamentStatus.Cancelled;

    const [vaultPda] = await findVaultPda(
        { tournament: pda },
        { programAddress },
    );

    const tournament: Tournament = {
        discriminator: EMPTY_DISCRIMINATOR,
        organizer: address(it.organizer),
        name: it.name,
        tokenMint: address(it.tokenMint),
        vault: vaultPda,
        entryFee: bigFromString(it.entryFee),
        organizerDeposit: bigFromString(it.organizerDeposit),
        organizerDepositRefunded,
        maxParticipants: it.maxParticipants,
        bracketSize,
        participantCount,
        matchesInitialized,
        matchesReported,
        totalMatches,
        registrationDeadline: unixSecToBig(it.registrationDeadline),
        createdAt: unixSecToBig(it.createdAt),
        startedAt: 0n, // not in indexer; only used for analytics, harmless
        completedAt: unixSecToBig(it.completedAt),
        status: statusKind,
        payoutPreset: presetKind,
        seedHash: new Uint8Array(32),
        champion: addrOrDefault(it.champion),
        bump: 0,
        vaultBump: 0,
        // Stage B / VRF fields. The indexer carries settlementMode (backfilled
        // set-once by the reconciliation cron); until that first reconcile it is
        // null, in which case we default to OrganizerOnly — the safe MVP flow,
        // and the chain reconcile corrects it within a few hundred ms if wrong.
        // game is backfilled set-once by the reconciliation cron (like
        // settlementMode); null until the first reconcile → treat as Manual
        // (the safe, no-identity-gate default). disputeWindowSecs / vrf state
        // still aren't cached by the indexer, so they keep harmless defaults.
        game:
            it.game !== null
                ? INDEXER_GAME_TO_KIND[it.game]
                : SupportedGame.Manual,
        settlementMode:
            it.settlementMode !== null
                ? INDEXER_SETTLEMENT_TO_KIND[it.settlementMode]
                : SettlementMode.OrganizerOnly,
        disputeWindowSecs: 0,
        vrfRandomnessAccount: DEFAULT_ADDRESS,
        vrfCommitSlot: 0n,
        seedRevealed: false,
        // Stage C: arbitrator defaults to organizer at create-time; the
        // reconciliation cron backfills it. Treat missing as organizer (matches
        // on-chain default).
        arbitrator: it.arbitrator ? address(it.arbitrator) : address(it.organizer),
        // R15 formats schema-prep: the indexer doesn't carry format yet; V1 is
        // single-elim only, which is also the on-chain zero-fill default.
        format: TournamentFormat.SingleElim,
    };

    const participantsAdapted: ParticipantWithAddress[] = await Promise.all(
        participants.map(async (p): Promise<ParticipantWithAddress> => {
            const wallet = address(p.wallet);
            const [participantPda] = await findParticipantPda(
                { tournament: pda, player: wallet },
                { programAddress },
            );
            const account: Participant = {
                discriminator: EMPTY_DISCRIMINATOR,
                tournament: pda,
                wallet,
                seedIndex: p.seedIndex,
                refundPaid: p.refundPaid,
                bump: 0,
                // B-14 foundation stats / identity. The indexer carries the
                // numeric stats (backfilled by the reconciliation cron) but not
                // the attestation account; the raw identityHash bytes aren't
                // consumed by buildView, so default to empty.
                identityHash: EMPTY_IDENTITY_HASH,
                identityAttestation: DEFAULT_ADDRESS,
                wins: p.wins,
                losses: p.losses,
                pointsFor: p.pointsFor,
                pointsAgainst: p.pointsAgainst,
            };
            return { address: participantPda, account };
        }),
    );

    const bracket: MatchNodeWithAddress[] = await Promise.all(
        matches.map(async (m): Promise<MatchNodeWithAddress> => {
            const [matchPda] = await findMatchPda(
                {
                    tournament: pda,
                    bracket: m.bracket,
                    round: m.round,
                    matchIndex: m.matchIndex,
                },
                { programAddress },
            );
            const account: MatchNode = {
                discriminator: EMPTY_DISCRIMINATOR,
                tournament: pda,
                bracket: m.bracket,
                round: m.round,
                matchIndex: m.matchIndex,
                playerA: addrOrDefault(m.playerA),
                playerB: addrOrDefault(m.playerB),
                winner: addrOrDefault(m.winner),
                status: INDEXER_MATCH_STATUS[m.status],
                bye: m.bye,
                bump: 0,
                // Stage B settlement envelope — carried straight from the
                // indexer row so buildMatch can derive the 5-state UI status
                // and the report modal can render confirm/dispute/claim panels.
                proposalSource: INDEXER_PROPOSAL_TO_KIND[m.proposalSource],
                proposer: addrOrDefault(m.proposer),
                proposedWinner: addrOrDefault(m.proposedWinner),
                proposedAt: unixSecToBig(m.proposedAt),
                claimDeadline: unixSecToBig(m.claimDeadline),
                disputed: m.disputed,
                disputeReason: m.disputeReason ?? 0,
                // Stage C oracle commit/feed. The webhook events only carry
                // lobbyId + committedAt + switchboardFeed; the game-id hashes
                // and expectedFeedHash come from the reconciliation cron and
                // are null until that runs. Reconstruct MatchCommitment only
                // when the commit event has fired (lobbyId present); else
                // emit `null` to match the on-chain `Option<MatchCommitment>`
                // sentinel that the buildOracleCommit hook expects.
                commitment: m.lobbyId
                    ? some({
                          lobbyId: hexToBytes(m.lobbyId, 16),
                          playerAGameId: hexToBytes(m.playerAGameId, 32),
                          playerBGameId: hexToBytes(m.playerBGameId, 32),
                          expectedFeedHash: hexToBytes(m.expectedFeedHash, 32),
                          committedAt: unixSecToBig(m.committedAt),
                          committedSlot: 0n,
                      })
                    : none(),
                switchboardFeed: addrOrDefault(m.switchboardFeed),
                // R15 formats schema-prep: per-match scores arrive with formats
                // Phase A (RR tiebreakers); zero until then — single-elim
                // ignores them and the indexer doesn't carry them yet.
                scoreA: 0,
                scoreB: 0,
            };
            return { address: matchPda, account };
        }),
    );

    return {
        address: pda,
        tournament,
        participants: participantsAdapted,
        bracket,
    };
}
