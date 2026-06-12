"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { VersionedTransaction, VersionedMessage } from "@solana/web3.js";
import { fromLegacyPublicKey } from "@solana/compat";
import { useSignTransaction } from "@privy-io/react-auth/solana";
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
import { useActiveWallet } from "@/hooks/useActiveWallet";

/** Privy chain id for the configured cluster (external wallets ignore it). */
function solanaChainFromEnv(): "solana:mainnet" | "solana:devnet" {
    return process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
        ? "solana:mainnet"
        : "solana:devnet";
}

/**
 * Bridge a Privy connected Solana wallet to a Kit `TransactionModifyingSigner`.
 *
 * Privy owns wallet connection in this app, so signing goes through Privy's
 * `useSignTransaction` (works for both external wallets like Phantom and Privy
 * embedded wallets) rather than `@solana/wallet-adapter-react`.
 *
 * This is a `TransactionModifyingSigner` (NOT a partial signer) because wallets
 * are allowed to MODIFY the transaction before signing — Phantom injects its
 * own priority-fee ComputeBudget instructions (and Lighthouse guard ixs on
 * mainnet). A partial-signer that re-attaches the signature to the ORIGINAL
 * message fails preflight with "Transaction did not pass signature
 * verification" whenever the wallet touched the message. So we round-trip each
 * Kit `Transaction.messageBytes` through a v1 `VersionedTransaction`, let Privy
 * sign (and the wallet possibly rewrite) it, then hand Kit back the WALLET'S
 * message + signatures. Mirrors Kit's `useWalletAccountTransactionSigner`.
 *
 * Existing signatures on the Kit tx (e.g. a co-signer that already signed in a
 * prior pipe step) are forwarded into the v1 tx before signing. NOTE: if the
 * wallet modifies the message, prior co-signatures become invalid by
 * construction — for our flows the wallet is the only signer, so this is
 * theoretical.
 */
function bridgePrivyWalletToSigner(
    walletAddress: string,
    sign: (serialized: Uint8Array) => Promise<Uint8Array>,
): TransactionModifyingSigner {
    const myAddress = address(walletAddress);
    return {
        address: myAddress,
        modifyAndSignTransactions: (async (
            transactions: readonly Transaction[],
        ) => {
            const signed = await Promise.all(
                transactions.map(async (tx) => {
                    const compiled = VersionedMessage.deserialize(
                        tx.messageBytes as unknown as Uint8Array,
                    );
                    const vt = new VersionedTransaction(compiled);
                    // Preserve signatures already attached to the Kit tx so the
                    // wallet doesn't overwrite them with zero-filled placeholders.
                    for (const [addr, sig] of Object.entries(tx.signatures ?? {})) {
                        if (!sig) continue;
                        const idx = vt.message.staticAccountKeys.findIndex(
                            (k) => k.toBase58() === addr,
                        );
                        if (idx >= 0) vt.signatures[idx] = sig as Uint8Array;
                    }
                    const signedTransaction = await sign(vt.serialize());
                    return VersionedTransaction.deserialize(signedTransaction);
                }),
            );
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
    const { wallet, address: walletAddress } = useActiveWallet();
    const { signTransaction } = useSignTransaction();
    const chain = solanaChainFromEnv();

    // Privy returns a NEW `wallet` object and `signTransaction` function on
    // every render. Depending on them directly would rebuild the client each
    // render → consumers' effects (useTournaments, useDashboard) re-run forever
    // ("Maximum update depth exceeded"). Keep them in refs (updated in an
    // effect, never read during render) and key the memo on the stable
    // `walletAddress` string instead. `sign` is only invoked later from a user
    // gesture, so the one-render ref lag is irrelevant.
    const walletRef = useRef(wallet);
    const signTxRef = useRef(signTransaction);
    useEffect(() => {
        walletRef.current = wallet;
        signTxRef.current = signTransaction;
    });

    const sign = useCallback(
        async (serialized: Uint8Array): Promise<Uint8Array> => {
            const w = walletRef.current;
            if (!w) throw new Error("No connected wallet");
            const { signedTransaction } = await signTxRef.current({
                transaction: serialized,
                wallet: w,
                chain,
            });
            return signedTransaction;
        },
        [chain],
    );

    return useMemo(() => {
        if (!walletAddress) return null;
        return new BracketChainClient({
            rpc,
            rpcSubscriptions,
            // `sign` reads refs, but only inside the signer's async method at
            // signing time (a user gesture) — never during render. Stable by
            // [chain], so it doesn't churn the memo.
            // eslint-disable-next-line react-hooks/refs
            signer: bridgePrivyWalletToSigner(walletAddress, sign),
            programAddress: programAddressFromEnv(),
            commitment: "confirmed",
        });
    }, [rpc, rpcSubscriptions, walletAddress, sign]);
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
