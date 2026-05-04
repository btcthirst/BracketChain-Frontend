const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:3001";

export type IndexerTournamentStatus =
    | "Registration"
    | "PendingBracketInit"
    | "Active"
    | "Completed"
    | "Cancelled";

export type IndexerPayoutPreset = "WinnerTakesAll" | "Standard" | "Deep";

// `OrganizerRefund` (added 2026-05-03 in Phase 2.5) is the deposit returned to
// the organizer on cancel; distinct from per-participant `Refund`.
export type IndexerPayoutKind = "Prize" | "Refund" | "Fee" | "OrganizerRefund";

// BigInt fields are serialized as decimal strings by the indexer.
// See bracket-chain-indexer/src/tournaments/tournaments.controller.ts.
export interface IndexerTournament {
    address: string;
    organizer: string;
    name: string;
    /// SPL Token mint for entries + prizes. Renamed from `usdcMint` 2026-05-03 —
    /// the program is mint-agnostic; UI defaults to USDC for MVP demo.
    tokenMint: string;
    entryFee: string;
    /// Phase 2.5: optional organizer top-up to the prize pool. "0" when not set.
    organizerDeposit: string;
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
    name?: string;
    format?: string;
    game?: string;
    minPrize?: number;
    maxPrize?: number;
    freeOnly?: boolean;
    offset?: number;
    limit?: number;
    signal?: AbortSignal;
} = {}): Promise<IndexerTournament[]> {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    // if (opts.name) params.set("name", opts.name);
    // These parameters are currently not supported by the production indexer 
    // and cause a 400 Bad Request if provided. 
    // We filter them client-side in the hooks for now.
    // if (opts.format) params.set("format", opts.format);
    // if (opts.game) params.set("game", opts.game);
    // if (opts.minPrize !== undefined) params.set("minPrize", String(opts.minPrize));
    // if (opts.maxPrize !== undefined) params.set("maxPrize", String(opts.maxPrize));
    // if (opts.freeOnly) params.set("freeOnly", "true");
    
    if (opts.offset !== undefined) params.set("offset", String(opts.offset));
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));

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
