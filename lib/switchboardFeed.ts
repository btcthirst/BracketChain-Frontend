import { Buffer } from "buffer";
import type { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
    buildDotaWinnerJobs,
    type DotaFeedJobParams,
} from "@bracketchain/sdk";

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

export async function fetchDotaIdentityHash(
    wallet: string,
): Promise<string | null> {
    const base = process.env.NEXT_PUBLIC_INDEXER_URL;
    if (!base) return null;
    const url = `${base.replace(/\/+$/, "")}/identity/${encodeURIComponent(wallet)}/dota2`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
        exists: boolean;
        identityHash?: string;
    };
    return json.exists && json.identityHash ? json.identityHash : null;
}

/** Assemble the canonical job params for a match — single spot so commit and
 * bind can never disagree on the URL shape. */
export function dotaFeedParams(
    lobbyHex: string,
    playerAIdentityHex: string,
    playerBIdentityHex: string,
): DotaFeedJobParams {
    return {
        endpointBaseUrl: oracleEndpointBaseUrl(),
        lobbyHex,
        playerAGameIdHex: playerAIdentityHex,
        playerBGameIdHex: playerBIdentityHex,
        source: "opendota",
    };
}

async function storeJobsOnCrossbar(
    name: string,
    params: DotaFeedJobParams,
): Promise<void> {
    const jobs = buildDotaWinnerJobs(params);
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

export interface CreateDotaPullFeedOptions {
    connection: Connection;
    walletPublicKey: PublicKey;
    /** wallet-adapter `signTransaction` (legacy tx path). */
    signTransaction: (tx: Transaction) => Promise<Transaction>;
    feedParams: DotaFeedJobParams;
    /** The 32 bytes committed on-chain as `expected_feed_hash`. */
    expectedFeedHash: Uint8Array;
    /** Display name stored with the feed (≤32 bytes). */
    name: string;
    /** Oracle responses required per update — keep equal to the protocol's
     * `min_oracle_samples` (1 on devnet until the go-live toggle). */
    minResponses?: number;
    onStage?: (stage: BindStage) => void;
}

export interface CreateDotaPullFeedResult {
    feedAddress: string;
    signature: string;
}

export async function createDotaPullFeed(
    opts: CreateDotaPullFeedOptions,
): Promise<CreateDotaPullFeedResult> {
    const {
        connection,
        walletPublicKey,
        signTransaction,
        feedParams,
        expectedFeedHash,
        name,
        minResponses = 1,
        onStage,
    } = opts;

    onStage?.("store");
    await storeJobsOnCrossbar(name, feedParams);

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
