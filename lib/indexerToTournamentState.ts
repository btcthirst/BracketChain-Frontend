import { PublicKey } from "@solana/web3.js";
import {
    BN,
    findMatchPda,
    findParticipantPda,
    findVaultPda,
    payoutPreset as makePayoutPreset,
    type MatchNode,
    type MatchNodeWithAddress,
    type Participant,
    type ParticipantWithAddress,
    type PayoutPresetKind,
    type Tournament,
    type TournamentState,
    type TournamentStatusKind,
    type TournamentStatusVariant,
    type IndexerTournament,
    type IndexerParticipant,
    type IndexerMatch,
} from "@bracketchain/sdk";

// Shape parity with `payoutPreset()` helper. Constructs
// `{ [variant]: {} }` for an arbitrary enum kind string. Anchor's IDL types
// don't expose a generic enum-builder, hence the local copy.
function makeStatusVariant(kind: TournamentStatusKind): TournamentStatusVariant {
    return { [kind]: {} } as unknown as TournamentStatusVariant;
}

function makeMatchStatusVariant(kind: "pending" | "active" | "completed") {
    return { [kind]: {} } as unknown as MatchNode["status"];
}

const INDEXER_STATUS_TO_KIND: Record<IndexerTournament["status"], TournamentStatusKind> = {
    Registration: "registration",
    PendingBracketInit: "pendingBracketInit",
    Active: "active",
    Completed: "completed",
    Cancelled: "cancelled",
};

const INDEXER_PRESET_TO_KIND: Record<IndexerTournament["payoutPreset"], PayoutPresetKind> = {
    WinnerTakesAll: "winnerTakesAll",
    Standard: "standard",
    Deep: "deep",
};

const INDEXER_MATCH_STATUS: Record<IndexerMatch["status"], "pending" | "active" | "completed"> = {
    Pending: "pending",
    Active: "active",
    Completed: "completed",
};

function nextPow2(n: number): number {
    if (n <= 1) return 1;
    return 1 << Math.ceil(Math.log2(n));
}

function unixSecToBN(iso: string | null): BN {
    if (!iso) return new BN(0);
    const sec = Math.floor(new Date(iso).getTime() / 1000);
    return new BN(sec);
}

function bnFromString(s: string | null): BN {
    if (s == null || s === "") return new BN(0);
    return new BN(s);
}

function pkOrDefault(s: string | null): PublicKey {
    if (!s) return PublicKey.default;
    try {
        return new PublicKey(s);
    } catch {
        return PublicKey.default;
    }
}

/**
 * Phase 5.3: convert (IndexerTournament + IndexerParticipant[] + IndexerMatch[])
 * into the SDK's `TournamentState` shape so the existing chain-shaped `buildView`
 * helper consumes it unchanged. Approximates fields the indexer doesn't carry
 * (bracket_size, matches_initialized, organizer_deposit_refunded, seed_hash) —
 * see inline notes for each.
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
export function indexerToTournamentState(
    pda: PublicKey,
    programId: PublicKey,
    it: IndexerTournament,
    participants: IndexerParticipant[],
    matches: IndexerMatch[],
): TournamentState {
    const statusKind = INDEXER_STATUS_TO_KIND[it.status];
    const presetKind = INDEXER_PRESET_TO_KIND[it.payoutPreset];

    const participantCount = participants.length;
    const isActiveOrTerminal =
        statusKind === "active" ||
        statusKind === "completed" ||
        statusKind === "cancelled";

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
    const organizerDepositRefunded = statusKind === "cancelled";

    const [vaultPda] = findVaultPda(pda, programId);

    const tournament: Tournament = {
        organizer: new PublicKey(it.organizer),
        name: it.name,
        tokenMint: new PublicKey(it.tokenMint),
        vault: vaultPda,
        entryFee: bnFromString(it.entryFee),
        organizerDeposit: bnFromString(it.organizerDeposit),
        organizerDepositRefunded,
        maxParticipants: it.maxParticipants,
        bracketSize,
        participantCount,
        matchesInitialized,
        matchesReported,
        totalMatches,
        registrationDeadline: unixSecToBN(it.registrationDeadline),
        createdAt: unixSecToBN(it.createdAt),
        startedAt: new BN(0), // not in indexer; only used for analytics, harmless
        completedAt: unixSecToBN(it.completedAt),
        status: makeStatusVariant(statusKind),
        payoutPreset: makePayoutPreset(presetKind),
        seedHash: new Array(32).fill(0) as unknown as Tournament["seedHash"],
        champion: pkOrDefault(it.champion),
        bump: 0,
        vaultBump: 0,
    };

    const participantsAdapted: ParticipantWithAddress[] = participants.map((p) => {
        const wallet = new PublicKey(p.wallet);
        const [participantPda] = findParticipantPda(pda, wallet, programId);
        const account: Participant = {
            tournament: pda,
            wallet,
            seedIndex: p.seedIndex,
            refundPaid: p.refundPaid,
            bump: 0,
        };
        return { address: participantPda, account };
    });

    const bracket: MatchNodeWithAddress[] = matches.map((m) => {
        const [matchPda] = findMatchPda(pda, m.round, m.matchIndex, programId);
        const account: MatchNode = {
            tournament: pda,
            round: m.round,
            matchIndex: m.matchIndex,
            playerA: pkOrDefault(m.playerA),
            playerB: pkOrDefault(m.playerB),
            winner: pkOrDefault(m.winner),
            status: makeMatchStatusVariant(INDEXER_MATCH_STATUS[m.status]),
            bye: m.bye,
            bump: 0,
        };
        return { address: matchPda, account };
    });

    return {
        address: pda,
        tournament,
        participants: participantsAdapted,
        bracket,
    };
}
