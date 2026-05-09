// Local Indexer types and HTTP client — previously re-exported from @bracketchain/sdk,
// removed in the SDK update that dropped BracketChainIndexerClient.

export type IndexerTournamentStatus =
    | "Registration"
    | "PendingBracketInit"
    | "Active"
    | "Completed"
    | "Cancelled";

export interface IndexerTournament {
    address: string;
    name: string;
    organizer: string;
    tokenMint: string;
    entryFee: string;
    organizerDeposit: string;
    maxParticipants: number;
    status: IndexerTournamentStatus;
    payoutPreset: "WinnerTakesAll" | "Standard" | "Deep";
    registrationDeadline: string | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    champion: string | null;
    grossPool: string | null;
    chainSlotAtWrite: number;
}

export interface IndexerParticipant {
    wallet: string;
    seedIndex: number;
    refundPaid: boolean;
}

export interface IndexerMatch {
    round: number;
    matchIndex: number;
    playerA: string | null;
    playerB: string | null;
    winner: string | null;
    status: "Pending" | "Active" | "Completed";
    bye: boolean;
}

export interface IndexerPayout {
    kind: string;
    placement: number;
    amount: string;
    recipient: string | null;
    txSignature: string | null;
}

interface ListTournamentsOpts {
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
}

interface RequestOpts {
    signal?: AbortSignal;
}

export class BracketChainIndexerClient {
    private readonly baseUrl: string;

    constructor({ baseUrl }: { baseUrl: string }) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
    }

    private async get<T>(path: string, signal?: AbortSignal): Promise<T> {
        const res = await fetch(`${this.baseUrl}${path}`, { signal });
        if (!res.ok) throw new Error(`Indexer ${path} → HTTP ${res.status}`);
        return res.json() as Promise<T>;
    }

    listTournaments(opts: ListTournamentsOpts = {}): Promise<IndexerTournament[]> {
        const params = new URLSearchParams();
        if (opts.status) params.set("status", opts.status);
        if (opts.limit != null) params.set("limit", String(opts.limit));
        const qs = params.size > 0 ? `?${params}` : "";
        return this.get<IndexerTournament[]>(`/tournaments${qs}`, opts.signal);
    }

    getTournament(address: string, opts: RequestOpts = {}): Promise<IndexerTournament> {
        return this.get<IndexerTournament>(`/tournaments/${address}`, opts.signal);
    }

    getParticipants(address: string, opts: RequestOpts = {}): Promise<IndexerParticipant[]> {
        return this.get<IndexerParticipant[]>(`/tournaments/${address}/participants`, opts.signal);
    }

    getMatches(address: string, opts: RequestOpts = {}): Promise<IndexerMatch[]> {
        return this.get<IndexerMatch[]>(`/tournaments/${address}/matches`, opts.signal);
    }

    getPayouts(address: string, opts: RequestOpts = {}): Promise<IndexerPayout[]> {
        return this.get<IndexerPayout[]>(`/tournaments/${address}/payouts`, opts.signal);
    }
}
