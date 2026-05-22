"use client";

import { useMemo } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { VersionedTransaction, VersionedMessage } from "@solana/web3.js";
import { fromLegacyPublicKey } from "@solana/compat";
import {
    address,
    createSolanaRpc,
    createSolanaRpcSubscriptions,
    type Address,
    type Rpc,
    type RpcSubscriptions,
    type SignatureBytes,
    type SignatureDictionary,
    type SolanaRpcApi,
    type SolanaRpcSubscriptionsApi,
    type TransactionPartialSigner,
} from "@solana/kit";
import {
    BracketChainClient,
    BracketChainIndexerClient,
} from "@bracketchain/sdk";

type AnchorWallet = NonNullable<ReturnType<typeof useAnchorWallet>>;

/**
 * Phase 0 Stage 4 (Codama migration) bridge:
 *
 * `@solana/wallet-adapter-react` is still web3.js v1-shaped (it yields an
 * AnchorWallet with `publicKey: PublicKey` and `signAllTransactions(Vt[])`).
 * SDK (0.5.0+) is Kit-native and expects a `TransactionPartialSigner` whose
 * `signTransactions` returns `SignatureDictionary[]` keyed by Kit `Address`.
 *
 * The bridge round-trips each Kit `Transaction.messageBytes` through a v1
 * `VersionedTransaction`, lets the wallet adapter sign it, then extracts our
 * signature byte slot back into a `SignatureDictionary`. Existing signatures
 * on the Kit tx (e.g. a co-signer that already signed) are forwarded into
 * the v1 tx before signing so the wallet doesn't overwrite them.
 *
 * `@solana/compat` provides the `PublicKey → Address` conversion. There is no
 * first-party wallet-adapter→Kit bridge, hence this local adapter.
 */
function bridgeAnchorWalletToSigner(
    wallet: AnchorWallet,
): TransactionPartialSigner {
    const myAddress = fromLegacyPublicKey(wallet.publicKey);
    return {
        address: myAddress,
        async signTransactions(transactions) {
            const v1Txs = transactions.map((tx) => {
                const compiled = VersionedMessage.deserialize(
                    tx.messageBytes as unknown as Uint8Array,
                );
                const vt = new VersionedTransaction(compiled);
                // Preserve signatures already attached to the Kit tx (e.g. a
                // co-signer that signed in a prior pipe step) so the wallet
                // doesn't overwrite them with zero-filled placeholders.
                for (const [addr, sig] of Object.entries(tx.signatures ?? {})) {
                    if (!sig) continue;
                    const idx = vt.message.staticAccountKeys.findIndex(
                        (k) => k.toBase58() === addr,
                    );
                    if (idx >= 0) vt.signatures[idx] = sig as Uint8Array;
                }
                return vt;
            });
            const signed = await wallet.signAllTransactions(v1Txs);
            return signed.map((vt): SignatureDictionary => {
                const idx = vt.message.staticAccountKeys.findIndex((k) =>
                    k.equals(wallet.publicKey),
                );
                const sig = idx >= 0 ? vt.signatures[idx] : null;
                if (!sig || sig.every((b) => b === 0)) return {};
                return {
                    [myAddress]: new Uint8Array(sig) as SignatureBytes,
                };
            });
        },
    };
}

function programAddressFromEnv(): Address | undefined {
    const env = process.env.NEXT_PUBLIC_PROGRAM_ID;
    return env ? address(env) : undefined;
}

/**
 * Derive the wss endpoint matching a Kit RPC http(s) endpoint. Mirrors what
 * `@solana/wallet-adapter-react` does internally for its Connection's wsEndpoint.
 */
function deriveWsEndpoint(httpEndpoint: string): string {
    if (httpEndpoint.startsWith("https://")) {
        return "wss://" + httpEndpoint.slice("https://".length);
    }
    if (httpEndpoint.startsWith("http://")) {
        return "ws://" + httpEndpoint.slice("http://".length);
    }
    return httpEndpoint;
}

function useKitRpc(): {
    rpc: Rpc<SolanaRpcApi>;
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
} {
    const { connection } = useConnection();
    return useMemo(() => {
        const endpoint = connection.rpcEndpoint;
        return {
            rpc: createSolanaRpc(endpoint),
            rpcSubscriptions: createSolanaRpcSubscriptions(
                deriveWsEndpoint(endpoint),
            ),
        };
    }, [connection.rpcEndpoint]);
}

export function useBracketChainClient(): BracketChainClient | null {
    const { rpc, rpcSubscriptions } = useKitRpc();
    const wallet = useAnchorWallet();

    return useMemo(() => {
        if (!wallet) return null;
        return new BracketChainClient({
            rpc,
            rpcSubscriptions,
            signer: bridgeAnchorWalletToSigner(wallet),
            programAddress: programAddressFromEnv(),
            commitment: "confirmed",
        });
    }, [rpc, rpcSubscriptions, wallet]);
}

/**
 * Read-only client for query-only pages (e.g. `/t/[id]`). Wallet connection
 * is not required — viewers can browse tournaments without signing in.
 * Mutating SDK methods throw `BracketChainSDKError(ReadOnlyClient)` if called.
 */
export function useReadOnlySdkClient(): BracketChainClient {
    const { rpc, rpcSubscriptions } = useKitRpc();
    return useMemo(
        () =>
            new BracketChainClient({
                rpc,
                rpcSubscriptions,
                programAddress: programAddressFromEnv(),
                commitment: "confirmed",
            }),
        [rpc, rpcSubscriptions],
    );
}

// ── Indexer client (Phase 5.3) ────────────────────────────────────────────────
// Module-level singleton so SWR fetches reuse the same baseUrl + bound fetch
// implementation across hook instances. Hot-module-reload friendly: `let`
// rebinding survives Next.js dev refresh.

let _indexerClient: BracketChainIndexerClient | null = null;

/**
 * Get (lazily) the SDK indexer client. Returns `null` when
 * `NEXT_PUBLIC_INDEXER_URL` is unset — callers fall back to chain-only reads
 * and SWR layer treats this as "indexer is down".
 */
export function getIndexerClient(): BracketChainIndexerClient | null {
    if (_indexerClient) return _indexerClient;
    const baseUrl = process.env.NEXT_PUBLIC_INDEXER_URL;
    if (!baseUrl) return null;
    _indexerClient = new BracketChainIndexerClient({ baseUrl });
    return _indexerClient;
}
