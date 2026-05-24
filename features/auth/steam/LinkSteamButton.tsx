"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * "Link Steam" entry point. Sends the user through the Steam OpenID flow
 * (`/api/auth/steam/login`), carrying the connected wallet + current path so the
 * callback can bind the verified Steam identity and return here. After the
 * round-trip the page URL carries `?steam=<status>` which this component reads
 * to show inline feedback.
 *
 * Requires a connected wallet (the attestation binds to it). Hidden otherwise.
 */
const STATUS_TEXT: Record<string, string> = {
    linked: "✓ Steam linked — identity attestation issued.",
    invalid: "Steam verification failed. Please try again.",
    verify_failed: "Couldn't reach Steam to verify. Try again.",
    attest_failed: "Steam verified, but issuing the on-chain attestation failed.",
    no_indexer: "Steam verified, but the indexer is not configured.",
    error: "Something went wrong linking Steam.",
};

export function LinkSteamButton() {
    const { publicKey } = useWallet();
    const pathname = usePathname();
    const steamStatus = useSearchParams().get("steam");

    if (!publicKey) return null;

    const href =
        `/api/auth/steam/login?wallet=${publicKey.toBase58()}` +
        `&returnTo=${encodeURIComponent(pathname)}`;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a
                href={href}
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
                    textDecoration: "none",
                }}
            >
                Link Steam
            </a>
            {steamStatus && STATUS_TEXT[steamStatus] && (
                <p
                    style={{
                        fontSize: "0.72rem",
                        color:
                            steamStatus === "linked"
                                ? "#22d47e"
                                : "rgba(245,158,11,0.9)",
                    }}
                >
                    {STATUS_TEXT[steamStatus]}
                </p>
            )}
        </div>
    );
}
