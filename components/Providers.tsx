"use client";

import { FC, ReactNode, useMemo } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import "@solana/wallet-adapter-react-ui/styles.css";

/**
 * Solana wallet-standard connectors for Privy.
 *
 * Created once at module scope — never inside the component — so React never
 * sees a new reference on re-render, which would force the WalletProvider to
 * re-register all wallets and drop the active connection.
 *
 * `toSolanaWalletConnectors` registers Privy's embedded Solana wallet (and any
 * Wallet-Standard wallets detected in the browser, e.g. Phantom) into the
 * @solana/wallet-adapter-react WalletProvider. All existing `useWallet()`,
 * `useAnchorWallet()`, and `useBracketChainClient()` call sites work unchanged.
 */


import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePrivy } from "@privy-io/react-auth";

interface Props {
    children: ReactNode;
}

/**
 * Automatically bridges Privy's authentication state to the Solana wallet-adapter.
 * When a user logs in via Privy, this component detects the registered Privy standard
 * wallet in the wallet-adapter stack, selects it, and connects it.
 * When they log out, it automatically disconnects.
 */
const PrivySolanaWalletBridge: FC = () => {
    const { authenticated, ready } = usePrivy();
    const { wallets, select, connect, connected, wallet, disconnect } = useWallet();

    useEffect(() => {
        if (!ready || !authenticated) return;
        if (connected) return;

        // Find the Privy wallet standard adapter
        const privyWallet = wallets.find(
            (w) => w.adapter.name.toLowerCase().includes("privy")
        );

        if (privyWallet) {
            if (wallet?.adapter.name !== privyWallet.adapter.name) {
                console.log("[PrivySolanaWalletBridge] Selecting Privy wallet adapter:", privyWallet.adapter.name);
                select(privyWallet.adapter.name);
            } else {
                console.log("[PrivySolanaWalletBridge] Connecting Privy wallet adapter...");
                connect().catch((err) => {
                    console.error("[PrivySolanaWalletBridge] Failed to connect Privy wallet adapter:", err);
                });
            }
        }
    }, [ready, authenticated, connected, wallets, wallet, select, connect]);

    useEffect(() => {
        if (ready && !authenticated && connected) {
            console.log("[PrivySolanaWalletBridge] Disconnecting wallet adapter due to Privy logout");
            disconnect().catch((err) => {
                console.error("[PrivySolanaWalletBridge] Failed to disconnect wallet adapter:", err);
            });
        }
    }, [ready, authenticated, connected, disconnect]);

    return null;
};

const WalletContextProvider: FC<Props> = ({ children }) => {
    const solanaConnectors = useMemo(() =>
        toSolanaWalletConnectors({ shouldAutoConnect: true }),
        []);
    const endpoint =
        process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
            config={{
                appearance: {
                    theme: "dark",
                    landingHeader: "Sign in to BracketChain",
                    loginMessage: "Connect your account to join and create tournaments on Solana.",
                    walletChainType: "solana-only",
                    walletList: ["phantom", "solflare", "backpack"]
                },
                loginMethods: ["wallet", "email", "sms", "google", "apple"],
                embeddedWallets: {
                    solana: { createOnLogin: "users-without-wallets" },
                },
                // Registers Privy's embedded wallet + any detected Wallet-Standard
                // wallets (Phantom, Backpack, etc.) into the adapter stack below.
                externalWallets: {
                    solana: { connectors: solanaConnectors },
                },
            }}
        >
            <ConnectionProvider endpoint={endpoint}>
                {/*
                 * wallets={[]} — legacy adapter list is intentionally empty.
                 * Wallet-Standard wallets (including Privy's embedded wallet)
                 * are injected automatically by the solanaConnectors above.
                 */}
                <WalletProvider wallets={[]} autoConnect>
                    <PrivySolanaWalletBridge />
                    {/*<WalletModalProvider>{children}</WalletModalProvider>*/}
                    {children}
                </WalletProvider>
            </ConnectionProvider>
        </PrivyProvider>
    );
};

export default WalletContextProvider;