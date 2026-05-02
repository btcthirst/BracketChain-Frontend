const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:3001";

export type IndexerTournamentStatus =
    | "Registration"
    | "PendingBracketInit"
    | "Active"
    | "Completed"
    | "Cancelled";

export type IndexerPayoutPreset = "WinnerTakesAll" | "Standard" | "Deep";

export type IndexerPayoutKind = "Prize" | "Refund" | "Fee";

// BigInt fields are serialized as decimal strings by the indexer.
// See bracket-chain-indexer/src/tournaments/tournaments.controller.ts.
export interface IndexerTournament {
    address: string;
    organizer: string;
    name: string;
    usdcMint: string;
    entryFee: string;
    maxParticipants: number;
    payoutPreset: IndexerPayoutPreset;
    registrationDeadline: string;
    status: IndexerTournamentStatus;
    champion: string | null;
    grossPool: string | null;
    feeAmount: string | null;
    netPool: string | null;
    createdAt: string;
    completedAt: string | null;
    createdTxSig: string;
    completedTxSig: string | null;
}

export interface IndexerPayout {
    id: string;
    tournamentAddress: string;
    recipient: string;
    amount: string;
    kind: IndexerPayoutKind;
    placement: number | null;
    txSignature: string;
    createdAt: string;
}

export async function listIndexerTournaments(opts: {
    status?: IndexerTournamentStatus;
    limit?: number;
    signal?: AbortSignal;
} = {}): Promise<IndexerTournament[]> {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.limit) params.set("limit", String(opts.limit));

    const url = `${INDEXER_URL}/tournaments${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url, { signal: opts.signal });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Indexer ${res.status}: ${body || res.statusText}`);
    }
    return res.json() as Promise<IndexerTournament[]>;
}

export async function getIndexerPayouts(
    address: string,
    opts: { signal?: AbortSignal } = {},
): Promise<IndexerPayout[]> {
    const url = `${INDEXER_URL}/tournaments/${address}/payouts`;
    const res = await fetch(url, { signal: opts.signal });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Indexer ${res.status}: ${body || res.statusText}`);
    }
    return res.json() as Promise<IndexerPayout[]>;
}
