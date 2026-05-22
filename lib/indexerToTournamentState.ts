import { address, type Address } from "@solana/kit";
import {
    findMatchPda,
    findParticipantPda,
    findVaultPda,
    IndexerMatch,
    IndexerParticipant,
    IndexerTournament,
    MatchStatus,
    PayoutPreset,
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
};

const INDEXER_PRESET_TO_KIND: Record<IndexerTournament["payoutPreset"], PayoutPreset> = {
    WinnerTakesAll: PayoutPreset.WinnerTakesAll,
    Standard: PayoutPreset.Standard,
    Deep: PayoutPreset.Deep,
};

const INDEXER_MATCH_STATUS: Record<IndexerMatch["status"], MatchStatus> = {
    Pending: MatchStatus.Pending,
    Active: MatchStatus.Active,
    Completed: MatchStatus.Completed,
};

const DEFAULT_ADDRESS = address("11111111111111111111111111111111");
const EMPTY_DISCRIMINATOR = new Uint8Array(8);

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
            };
            return { address: participantPda, account };
        }),
    );

    const bracket: MatchNodeWithAddress[] = await Promise.all(
        matches.map(async (m): Promise<MatchNodeWithAddress> => {
            const [matchPda] = await findMatchPda(
                { tournament: pda, round: m.round, matchIndex: m.matchIndex },
                { programAddress },
            );
            const account: MatchNode = {
                discriminator: EMPTY_DISCRIMINATOR,
                tournament: pda,
                round: m.round,
                matchIndex: m.matchIndex,
                playerA: addrOrDefault(m.playerA),
                playerB: addrOrDefault(m.playerB),
                winner: addrOrDefault(m.winner),
                status: INDEXER_MATCH_STATUS[m.status],
                bye: m.bye,
                bump: 0,
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
