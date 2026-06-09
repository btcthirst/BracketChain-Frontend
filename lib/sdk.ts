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
    type Transaction,
    type TransactionModifyingSigner,
} from "@solana/kit";
import { BracketChainClient } from "@bracketchain/sdk";
import { BracketChainIndexerClient } from "./indexerClient";

type AnchorWallet = NonNullable<ReturnType<typeof useAnchorWallet>>;

/**
 * Phase 0 Stage 4 (Codama migration) bridge:
 *
 * `@solana/wallet-adapter-react` is still web3.js v1-shaped (it yields an
 * AnchorWallet with `publicKey: PublicKey` and `signAllTransactions(Vt[])`).
 * SDK (0.5.0+) is Kit-native and expects a Kit `TransactionSigner`.
 *
 * This is a `TransactionModifyingSigner` (NOT a partial signer) because
 * browser wallets are allowed to MODIFY the transaction before signing —
 * Phantom injects its own priority-fee ComputeBudget instructions (and
 * Lighthouse guard ixs on mainnet). A partial-signer bridge that re-attaches
 * the wallet's signature to the ORIGINAL message fails preflight with
 * "Transaction did not pass signature verification" whenever the wallet
 * touched the message. So we round-trip each Kit `Transaction.messageBytes`
 * through a v1 `VersionedTransaction`, let the wallet sign (and possibly
 * rewrite) it, then hand Kit back the WALLET'S message + signatures.
 * Mirrors Kit's own `useWalletAccountTransactionSigner` contract.
 *
 * Existing signatures on the Kit tx (e.g. a co-signer that already signed in
 * a prior pipe step) are forwarded into the v1 tx before signing. NOTE: if
 * the wallet does modify the message, prior co-signatures become invalid by
 * construction — for our flows the wallet is the only signer, so this is
 * theoretical.
 *
 * `@solana/compat` provides the `PublicKey → Address` conversion. There is no
 * first-party wallet-adapter→Kit bridge, hence this local adapter.
 */
function bridgeAnchorWalletToSigner(
    wallet: AnchorWallet,
): TransactionModifyingSigner {
    const myAddress = fromLegacyPublicKey(wallet.publicKey);
    return {
        address: myAddress,
        // Cast: Kit brands the return type with TransactionWithinSizeLimit &
        // TransactionWithLifetime. The wallet's tx keeps our blockhash
        // lifetime, and size is enforced by the RPC at send time — mirroring
        // Kit's own useWalletAccountTransactionSigner, which asserts these
        // brands rather than proving them structurally.
        modifyAndSignTransactions: (async (
            transactions: readonly Transaction[],
        ) => {
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
            return transactions.map((tx, i) => {
                const vt = signed[i];
                // The wallet may have rewritten the message (priority fees,
                // guards) — serialize ITS message, not our original one.
                const messageBytes = vt.message.serialize();
                const signatures: Record<Address, SignatureBytes | null> = {};
                const { numRequiredSignatures } = vt.message.header;
                vt.message.staticAccountKeys
                    .slice(0, numRequiredSignatures)
                    .forEach((key, idx) => {
                        const sig = vt.signatures[idx];
                        signatures[fromLegacyPublicKey(key)] =
                            sig && !sig.every((b) => b === 0)
                                ? (new Uint8Array(sig) as SignatureBytes)
                                : null;
                    });
                // Spread keeps the input tx's type brands (lifetime, size);
                // messageBytes/signatures are overridden with the wallet's.
                return Object.freeze({
                    ...tx,
                    messageBytes:
                        messageBytes as unknown as typeof tx.messageBytes,
                    signatures: Object.freeze(
                        signatures,
                    ) as SignatureDictionary,
                });
            });
        }) as unknown as TransactionModifyingSigner["modifyAndSignTransactions"],
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
