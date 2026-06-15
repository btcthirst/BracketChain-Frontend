"use client";

import { FC, ReactNode, useMemo } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { ConnectionProvider } from "@solana/wallet-adapter-react";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { LOGIN_METHODS } from "@/lib/privyAuth";

/**
 * App providers.
 *
 * Privy owns authentication AND wallet connection. External wallets (Phantom,
 * Solflare, Backpack) and Privy's embedded wallet are registered via
 * `toSolanaWalletConnectors` and surfaced through Privy's `useWallets()` /
 * `useSignTransaction()` hooks (see `hooks/useActiveWallet.ts` and `lib/sdk.ts`).
 *
 * `ConnectionProvider` from `@solana/wallet-adapter-react` is kept ONLY as a
 * convenient RPC connection source (`useConnection()` → balances, Switchboard
 * feed creation). We do NOT use `WalletProvider` — wallet state never flows
 * through wallet-adapter; reading it there would return null while Privy is
 * authenticated.
 *
 * `solanaConnectors` is created once at module-stable scope via `useMemo` so
 * React never sees a new reference on re-render.
 */

interface Props {
    children: ReactNode;
}

const WalletContextProvider: FC<Props> = ({ children }) => {
    const solanaConnectors = useMemo(
        () => toSolanaWalletConnectors({ shouldAutoConnect: true }),
        [],
    );
    const endpoint =
        process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

    // Privy needs a Kit RPC per Solana chain or its signing hooks throw
    // "No RPC configuration found for chain solana:<cluster>". Mirror the same
    // endpoint ConnectionProvider uses, keyed by the configured cluster.
    const solanaRpcs = useMemo(() => {
        const chain =
            process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
                ? "solana:mainnet"
                : "solana:devnet";
        const ws = endpoint.startsWith("https://")
            ? "wss://" + endpoint.slice("https://".length)
            : endpoint.startsWith("http://")
              ? "ws://" + endpoint.slice("http://".length)
              : endpoint;
        return {
            [chain]: {
                rpc: createSolanaRpc(endpoint),
                rpcSubscriptions: createSolanaRpcSubscriptions(ws),
            },
        };
    }, [endpoint]);

    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
            config={{
                appearance: {
                    theme: "dark",
                    // BracketChain brand green. Sets the accent for buttons and
                    // interactive elements; fine-grained color overrides live in
                    // the `body { --privy-color-* }` block in app/globals.css.
                    accentColor: "#22d47e",
                    landingHeader: "Sign in to BracketChain",
                    loginMessage:
                        "Connect your account to join and create tournaments on Solana.",
                    walletChainType: "solana-only",
                    walletList: ["phantom", "solflare", "backpack"],
                },
                loginMethods: LOGIN_METHODS,
                embeddedWallets: {
                    solana: { createOnLogin: "users-without-wallets" },
                },
                externalWallets: {
                    solana: { connectors: solanaConnectors },
                },
                solana: { rpcs: solanaRpcs },
            }}
        >
            <ConnectionProvider endpoint={endpoint}>
                {children}
            </ConnectionProvider>
        </PrivyProvider>
    );
};

export default WalletContextProvider;
