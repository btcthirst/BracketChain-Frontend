"use client";

import { useMemo } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BracketChainClient, type BracketChainClientOptions } from "@bracketchain/sdk";

function programIdFromEnv(): PublicKey | undefined {
    const env = process.env.NEXT_PUBLIC_PROGRAM_ID;
    return env ? new PublicKey(env) : undefined;
}

export function useBracketChainClient(): BracketChainClient | null {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    return useMemo(() => {
        if (!wallet) return null;

        return new BracketChainClient({
            connection,
            wallet: wallet as unknown as BracketChainClientOptions["wallet"],
            programId: programIdFromEnv(),
            commitment: "confirmed",
        });
    }, [connection, wallet]);
}

/**
 * Read-only client for query-only pages (e.g. /t/[id]). Does NOT require wallet
 * connection — viewers can browse tournaments without connecting Phantom.
 * Mutating SDK methods will throw if called.
 */
export function useReadOnlySdkClient(): BracketChainClient {
    const { connection } = useConnection();

    return useMemo(
        () =>
            new BracketChainClient({
                connection,
                programId: programIdFromEnv(),
                commitment: "confirmed",
            }),
        [connection],
    );
}
