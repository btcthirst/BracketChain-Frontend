"use client";

import { useMemo } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";

/**
 * Single source of truth for the active Solana wallet.
 *
 * Privy — not `@solana/wallet-adapter-react` — owns connection state in this
 * app. When a user logs in (external wallet like Phantom OR a Privy embedded
 * wallet), the connected Solana wallet shows up in Privy's `useWallets()`.
 * wallet-adapter's `useWallet()` is NOT wired to Privy's login, so reading
 * `publicKey` from it returns null even while authenticated — which is why
 * balances/signing must source the address from here instead.
 *
 * Returns the first connected Solana wallet. `address` is the base58 pubkey
 * string; consumers that need a web3.js `PublicKey` construct it locally.
 */
export function useActiveWallet(): {
    wallet: ConnectedStandardSolanaWallet | null;
    address: string | null;
    ready: boolean;
} {
    const { wallets, ready } = useWallets();
    const wallet = wallets[0] ?? null;
    return useMemo(
        () => ({ wallet, address: wallet?.address ?? null, ready }),
        [wallet, ready],
    );
}
