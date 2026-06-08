import { BracketChainSDKError } from "@bracketchain/sdk";

export type IndexerTournamentStatus =
  | "Registration"
  | "PendingBracketInit"
  | "Active"
  | "Completed"
  | "Cancelled"
  | "PartialCancelled";

export type IndexerPayoutPreset = "WinnerTakesAll" | "Standard" | "Deep";

export type IndexerPayoutKind = "Prize" | "Refund" | "Fee" | "OrganizerRefund";

export type IndexerMatchStatus =
  | "Pending"
  | "Active"
  | "PendingConfirmation"
  | "Disputed"
  | "Completed";

export type IndexerSettlementMode =
  | "OrganizerOnly"
  | "PlayerReported"
  | "Oracle";

export type IndexerGame =
  | "Manual"
  | "Dota2"
  | "Cs2Faceit"
  | "Valorant"
  | "LoL";

export type IndexerProposalSource =
  | "None"
  | "Player"
  | "Oracle"
  | "GameServer";

export interface IndexerTournament {
  address: string;
  organizer: string;
  name: string;
  tokenMint: string;
  entryFee: string;
  organizerDeposit: string;
  maxParticipants: number;
  payoutPreset: IndexerPayoutPreset;
  registrationDeadline: string;
  status: IndexerTournamentStatus;
  statusUpdatedAt: string;
  game: IndexerGame | null;
  champion: string | null;
  grossPool: string | null;
  feeAmount: string | null;
  netPool: string | null;
  createdAt: string;
  completedAt: string | null;
  createdTxSig: string;
  completedTxSig: string | null;
  chainSlotAtWrite: string;
  arbitrator: string | null;
  participantCount?: number;
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

export interface IndexerParticipant {
  id: string;
  tournamentAddress: string;
  wallet: string;
  seedIndex: number;
  refundPaid: boolean;
  registeredAt: string;
  registeredTxSig: string;
  chainSlotAtWrite: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  identityHash: string | null;
}

export interface IndexerMatch {
  id: string;
  tournamentAddress: string;
  bracket: number;
  round: number;
  matchIndex: number;
  playerA: string | null;
  playerB: string | null;
  winner: string | null;
  status: IndexerMatchStatus;
  bye: boolean;
  reportedAt: string | null;
  reportedTxSig: string | null;
  chainSlotAtWrite: string;
  proposalSource: IndexerProposalSource;
  proposer: string | null;
  proposedWinner: string | null;
  proposedAt: string | null;
  claimDeadline: string | null;
  disputed: boolean;
  disputeReason: number | null;
  lobbyId: string | null;
  playerAGameId: string | null;
  playerBGameId: string | null;
  expectedFeedHash: string | null;
  committedAt: string | null;
  switchboardFeed: string | null;
}

export interface IndexerClientOptions {
  /** Indexer base URL, e.g. `https://bracketchain-indexer-production.up.railway.app`. */
  baseUrl: string;
  /**
   * Optional fetch implementation. Defaults to globalThis.fetch. Provided
   * primarily for tests and edge-runtime environments that need a custom
   * fetch (e.g. Cloudflare Workers, Deno).
   */
  fetch?: typeof fetch;
}

export interface ListTournamentsOptions {
  status?: IndexerTournamentStatus;
  limit?: number;
  signal?: AbortSignal;
}

export interface GetPayoutsOptions {
  signal?: AbortSignal;
}

export interface GetParticipantsOptions {
  signal?: AbortSignal;
}

export interface GetMatchesOptions {
  signal?: AbortSignal;
}

export class BracketChainIndexerClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: IndexerClientOptions) {
    if (!opts.baseUrl) {
      throw new BracketChainSDKError(
        "BracketChainIndexerClient requires a baseUrl",
        "InvalidArgument",
      );
    }
    // Strip trailing slash so callers can pass either form without surprises.
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");

    const f = opts.fetch ?? (typeof globalThis !== "undefined" ? globalThis.fetch : undefined);
    if (!f) {
      throw new BracketChainSDKError(
        "fetch is not available in this environment — pass a fetch implementation via options.fetch",
        "FetchUnavailable",
      );
    }
    // Bind to globalThis to avoid `Illegal invocation` errors when using
    // `globalThis.fetch` directly (some runtimes are picky).
    this.fetchImpl = f.bind(globalThis);
  }

  /**
   * GET /tournaments — list indexed tournaments, newest-first.
   *
   * Server-side pagination is not yet implemented; pass `limit` (default 20,
   * max 100) and filter client-side for organizer-specific views.
   */
  async listTournaments(opts: ListTournamentsOptions = {}): Promise<IndexerTournament[]> {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.limit) params.set("limit", String(opts.limit));

    const url = `${this.baseUrl}/tournaments${params.toString() ? `?${params}` : ""}`;
    return this.requestJson<IndexerTournament[]>(url, { signal: opts.signal });
  }

  /**
   * GET /tournaments/:address — single tournament aggregate.
   * Throws on 404 (tournament not indexed). Phase 5.3 SWR consumer catches
   * the typed error and falls back to chain reads.
   */
  async getTournament(
    address: string,
    opts: GetPayoutsOptions = {},
  ): Promise<IndexerTournament> {
    const url = `${this.baseUrl}/tournaments/${address}`;
    return this.requestJson<IndexerTournament>(url, { signal: opts.signal });
  }

  /**
   * GET /tournaments/:address/payouts — per-placement Prize rows + Fee + Refund rows.
   *
   * Returns `[]` when the tournament has not been completed and no refunds
   * have been issued. Throws on 404 (tournament not indexed) or 5xx —
   * callers in the SWR layer should catch and degrade to chain reads.
   */
  async getPayouts(address: string, opts: GetPayoutsOptions = {}): Promise<IndexerPayout[]> {
    const url = `${this.baseUrl}/tournaments/${address}/payouts`;
    return this.requestJson<IndexerPayout[]>(url, { signal: opts.signal });
  }

  /**
   * GET /tournaments/:address/participants — registered participants ordered
   * by seedIndex. Phase 5.2.
   */
  async getParticipants(
    address: string,
    opts: GetParticipantsOptions = {},
  ): Promise<IndexerParticipant[]> {
    const url = `${this.baseUrl}/tournaments/${address}/participants`;
    return this.requestJson<IndexerParticipant[]>(url, { signal: opts.signal });
  }

  /**
   * GET /tournaments/:address/matches — match rows ordered by (round, matchIndex).
   * Phase 5.2: populated from MatchReported events; pending/bye matches are
   * filled by Phase 5.4 reconciliation. Frontend should treat empty results
   * for an in-progress tournament as "fall back to chain".
   */
  async getMatches(address: string, opts: GetMatchesOptions = {}): Promise<IndexerMatch[]> {
    const url = `${this.baseUrl}/tournaments/${address}/matches`;
    return this.requestJson<IndexerMatch[]>(url, { signal: opts.signal });
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private async requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(url, init);
    } catch (err) {
      // Network failure / abort — wrap so callers get a typed error to filter on.
      if (err instanceof Error && err.name === "AbortError") {
        throw err;  // preserve abort semantics for AbortController users
      }
      throw new BracketChainSDKError(
        `Indexer request failed: ${err instanceof Error ? err.message : String(err)}`,
        "IndexerNetworkError",
        err,
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new BracketChainSDKError(
        `Indexer ${res.status} ${res.statusText}: ${body || "(empty body)"}`,
        res.status >= 500 ? "IndexerServerError" : "IndexerClientError",
      );
    }
    return res.json() as Promise<T>;
  }
}
