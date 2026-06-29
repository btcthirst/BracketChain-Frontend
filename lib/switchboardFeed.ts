import { Buffer } from "buffer";
import type { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
    buildDotaWinnerJobs,
    buildCs2WinnerJobs,
    computeDotaFeedHash,
    computeCs2FeedHash,
    type DotaFeedJobParams,
    type Cs2FeedJobParams,
} from "@bracketchain/sdk";

/**
 * Games with an Oracle winner feed. The frontend's UIGameChoice uses
 * `cs2faceit`; normalize it here. Dota 2 reads OpenDota; CS2 reads the
 * indexer's stored DatHost result. The feed-job builder differs per game, so
 * commit + bind must agree on the game or `bind_match_feed` reverts on a hash
 * mismatch (R-2).
 */
export type FeedGame = "dota2" | "cs2";
export type GameFeedParams = DotaFeedJobParams | Cs2FeedJobParams;

export function feedGameFromKind(kind: string): FeedGame {
    return kind === "cs2" || kind === "cs2faceit" ? "cs2" : "dota2";
}

/** Indexer `/identity/:wallet/:game` slug for a feed game. */
function identitySlug(game: FeedGame): string {
    return game === "cs2" ? "cs2faceit" : "dota2";
}

const DEVNET_QUEUE_DEFAULT = "EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7";

export function switchboardQueue(): string {
    return process.env.NEXT_PUBLIC_SWITCHBOARD_QUEUE ?? DEVNET_QUEUE_DEFAULT;
}

export function crossbarUrl(): string {
    return (
        process.env.NEXT_PUBLIC_SWITCHBOARD_CROSSBAR_URL ??
        "https://crossbar.switchboard.xyz"
    ).replace(/\/+$/, "");
}

export function oracleEndpointBaseUrl(): string {
    const url =
        process.env.NEXT_PUBLIC_INDEXER_ORACLE_URL ??
        process.env.NEXT_PUBLIC_INDEXER_URL;
    if (!url) {
        throw new Error(
            "NEXT_PUBLIC_INDEXER_ORACLE_URL (or NEXT_PUBLIC_INDEXER_URL) must be set for Oracle-mode matches",
        );
    }
    return url.replace(/\/+$/, "");
}

/** Fetch a wallet's SAS identity hash for a feed game (same value across games
 * — it's SHA-256(steamId64) — but we hit the game-specific attestation). */
export async function fetchIdentityHash(
    wallet: string,
    game: FeedGame,
): Promise<string | null> {
    const base = process.env.NEXT_PUBLIC_INDEXER_URL;
    if (!base) return null;
    const url = `${base.replace(/\/+$/, "")}/identity/${encodeURIComponent(wallet)}/${identitySlug(game)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
        exists: boolean;
        identityHash?: string;
    };
    return json.exists && json.identityHash ? json.identityHash : null;
}

/** Back-compat Dota 2 wrapper. */
export function fetchDotaIdentityHash(wallet: string): Promise<string | null> {
    return fetchIdentityHash(wallet, "dota2");
}

/** Assemble the canonical job params for a match — single spot so commit and
 * bind can never disagree on the URL shape. */
export function feedParamsForGame(
    game: FeedGame,
    lobbyHex: string,
    playerAIdentityHex: string,
    playerBIdentityHex: string,
): GameFeedParams {
    const common = {
        endpointBaseUrl: oracleEndpointBaseUrl(),
        lobbyHex,
        playerAGameIdHex: playerAIdentityHex,
        playerBGameIdHex: playerBIdentityHex,
    };
    return game === "cs2"
        ? { ...common, source: "dathost" as const }
        : { ...common, source: "opendota" as const };
}

/** Back-compat Dota 2 wrapper. */
export function dotaFeedParams(
    lobbyHex: string,
    playerAIdentityHex: string,
    playerBIdentityHex: string,
): DotaFeedJobParams {
    return feedParamsForGame(
        "dota2",
        lobbyHex,
        playerAIdentityHex,
        playerBIdentityHex,
    ) as DotaFeedJobParams;
}

/** Compute `expected_feed_hash` for a game's feed job. */
export function computeFeedHashForGame(
    game: FeedGame,
    queueBase58: string,
    params: GameFeedParams,
): Uint8Array {
    return game === "cs2"
        ? computeCs2FeedHash(queueBase58, params as Cs2FeedJobParams)
        : computeDotaFeedHash(queueBase58, params as DotaFeedJobParams);
}

function buildJobsForGame(game: FeedGame, params: GameFeedParams) {
    return game === "cs2"
        ? buildCs2WinnerJobs(params as Cs2FeedJobParams)
        : buildDotaWinnerJobs(params as DotaFeedJobParams);
}

async function storeJobsOnCrossbar(
    name: string,
    game: FeedGame,
    params: GameFeedParams,
): Promise<void> {
    const jobs = buildJobsForGame(game, params);
    const feed = { name, jobs };

    try {
        const { CrossbarClient } = await import("@switchboard-xyz/common");
        await new CrossbarClient(crossbarUrl()).storeOracleFeed(feed);
        return;
    } catch {
        // CORS or transient Crossbar failure — fall through to the proxy.
    }

    const res = await fetch(`${oracleEndpointBaseUrl()}/oracle/crossbar-store`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ feed }),
    });
    if (!res.ok) {
        throw new Error(
            `Crossbar store failed (direct + proxy): ${res.status}. Oracles could not resolve the feed — retry.`,
        );
    }
}

// ── Feed creation ─────────────────────────────────────────────────────────────

export type BindStage = "store" | "create" | "confirm";

export interface CreatePullFeedOptions {
    connection: Connection;
    walletPublicKey: PublicKey;
    /** Feed game — selects the OracleJob builder stored on Crossbar. */
    game: FeedGame;
    /** wallet-adapter `signTransaction` (legacy tx path). */
    signTransaction: (tx: Transaction) => Promise<Transaction>;
    feedParams: GameFeedParams;
    /** The 32 bytes committed on-chain as `expected_feed_hash`. */
    expectedFeedHash: Uint8Array;
    /** Display name stored with the feed (≤32 bytes). */
    name: string;
    /** Oracle responses required per update — keep equal to the protocol's
     * `min_oracle_samples` (1 on devnet until the go-live toggle). */
    minResponses?: number;
    onStage?: (stage: BindStage) => void;
}

export interface CreatePullFeedResult {
    feedAddress: string;
    signature: string;
}

export async function createPullFeed(
    opts: CreatePullFeedOptions,
): Promise<CreatePullFeedResult> {
    const {
        connection,
        walletPublicKey,
        game,
        signTransaction,
        feedParams,
        expectedFeedHash,
        name,
        minResponses = 1,
        onStage,
    } = opts;

    onStage?.("store");
    await storeJobsOnCrossbar(name, game, feedParams);

    onStage?.("create");
    const [{ AnchorUtils, PullFeed }, web3] = await Promise.all([
        import("@switchboard-xyz/on-demand"),
        import("@solana/web3.js"),
    ]);

    const program = await AnchorUtils.loadProgramFromConnection(connection);
    const [pullFeed, feedKeypair] = PullFeed.generate(program);

    const ix = await pullFeed.initIx({
        name: name.slice(0, 32),
        queue: new web3.PublicKey(switchboardQueue()),
        feedHash: Buffer.from(expectedFeedHash),
        // A winner read is exact (0 or 1) — any variance between oracle
        // samples means a disagreement, not noise. Tolerate none.
        maxVariance: 0,
        minResponses,
        minSampleSize: minResponses,
        // Slots a submission stays usable — matches the protocol's
        // `max_stale_slots` (set-oracle-config.ts default).
        maxStaleness: 750,
        payer: walletPublicKey,
    });

    const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
    const tx = new web3.Transaction({
        feePayer: walletPublicKey,
        blockhash,
        lastValidBlockHeight,
    }).add(ix);

    tx.partialSign(feedKeypair);
    const signed = await signTransaction(tx);

    onStage?.("confirm");
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed",
    );

    return { feedAddress: pullFeed.pubkey.toBase58(), signature };
}
