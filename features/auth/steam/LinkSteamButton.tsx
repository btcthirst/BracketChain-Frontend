"use client";

import { useState } from "react";
import { useSignMessage } from "@privy-io/react-auth/solana";
import { getBase58Decoder } from "@solana/kit";
import { toast } from "sonner";
import { useActiveWallet } from "@/hooks/useActiveWallet";

/**
 * "Link Steam" entry point (A-11, Option B — indexer-owned OpenID).
 *
 * On click the connected wallet signs `bracketchain:bind-steam:<wallet>:<nonce>`
 * (the wallet is embedded so swapping it server-side breaks verification), then
 * we hand off to the indexer's `/identity/steam/login`. The indexer verifies the
 * signature, drives the Steam OpenID round-trip, issues the SAS attestation, and
 * redirects back here with `?steam=<status>` (surfaced by `<SteamStatusToast>`).
 *
 * Requires a connected wallet whose adapter supports `signMessage`. Hidden when
 * no wallet is connected.
 */
export function LinkSteamButton() {
    const { wallet: activeWallet, address } = useActiveWallet();
    const { signMessage } = useSignMessage();
    const [pending, setPending] = useState(false);

    if (!activeWallet || !address) return null;

    async function handleClick() {
        if (!activeWallet || !address) return;
        const indexer = process.env.NEXT_PUBLIC_INDEXER_URL;
        if (!indexer) {
            toast.error("Steam linking unavailable — indexer not configured.");
            return;
        }

        setPending(true);
        try {
            const wallet = address;
            const nonce = crypto.randomUUID();
            const message = `bracketchain:bind-steam:${wallet}:${nonce}`;
            const { signature } = await signMessage({
                message: new TextEncoder().encode(message),
                wallet: activeWallet,
            });
            const sigBase58 = getBase58Decoder().decode(signature);

            const url =
                `${indexer.replace(/\/$/, "")}/identity/steam/login` +
                `?wallet=${encodeURIComponent(wallet)}` +
                `&nonce=${encodeURIComponent(nonce)}` +
                `&sig=${encodeURIComponent(sigBase58)}` +
                `&returnTo=${encodeURIComponent(window.location.href)}`;
            window.location.assign(url);
        } catch (err) {
            const msg = (err as Error)?.message?.toLowerCase() ?? "";
            if (msg.includes("reject") || msg.includes("denied")) {
                toast.info("Signature request cancelled");
            } else {
                toast.error("Couldn't start Steam linking. Please try again.");
            }
            setPending(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={pending}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                alignSelf: "flex-start",
                background: "#1b2838",
                color: "#c7d5e0",
                fontSize: "0.85rem",
                fontWeight: 600,
                padding: "9px 16px",
                borderRadius: 8,
                border: "1px solid rgba(102,192,244,0.3)",
                cursor: pending ? "default" : "pointer",
                opacity: pending ? 0.6 : 1,
            }}
        >
            {pending ? "Opening Steam…" : "Link Steam"}
        </button>
    );
}
