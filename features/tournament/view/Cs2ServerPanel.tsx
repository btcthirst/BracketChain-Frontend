"use client";

import { useState, useEffect } from "react";
import { Copy, Loader2, Server, Swords } from "lucide-react";
import { useSignMessage } from "@privy-io/react-auth/solana";
import { getBase58Decoder } from "@solana/kit";
import { toast } from "sonner";

import { useActiveWallet } from "@/hooks/useActiveWallet";
import { getIndexerClient } from "@/lib/sdk";
import { Button } from "@/components/ui/button";
import type { Match, TournamentView } from "@/types/tournament";

const sectionLabel: React.CSSProperties = {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "0.74rem",
    color: "rgba(240,241,245,0.6)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
};

const fieldShell: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.78rem",
    color: "rgba(240,241,245,0.85)",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "10px 12px",
    wordBreak: "break-all",
};

const helperText: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.76rem",
    color: "rgba(240,241,245,0.55)",
    lineHeight: 1.5,
};

interface Props {
    tournament: TournamentView;
    match: Match;
    /** Server connect string (`host:port`) once provisioned — surfaced by the
     * indexer match read after launch. */
    serverConnect?: string | null;
    onLaunched?: () => void;
}

/**
 * CS2 DatHost server panel. The organizer launches the match (provisions the
 * server via the indexer's `/dathost/launch`, signing
 * `bracketchain:launch-cs2:<tournament>:<bracket>:<round>:<matchIndex>`); both
 * players get a "Join Server" deep link (`steam://connect/<host:port>`). Single
 * server → a launch while one is running comes back `queued`.
 */
export function Cs2ServerPanel({ tournament, match, serverConnect, onLaunched }: Props) {
    const { wallet, address } = useActiveWallet();
    const { signMessage } = useSignMessage();
    const [pending, setPending] = useState(false);
    const [connect, setConnect] = useState<string | null>(serverConnect ?? null);
    const [queued, setQueued] = useState(false);

    const isOrganizer = !!address && address === tournament.organizer.address;
    // Indexer rows store the 0-indexed on-chain round; the UI Match is 1-indexed.
    const onChainRound = match.round - 1;
    const bracket = 0;

    // Poll the indexer for the server connect string until it's provisioned, so
    // BOTH players (not just the launching organizer) get the "Join Server" link.
    useEffect(() => {
        if (connect) return;
        const client = getIndexerClient();
        if (!client) return;
        let active = true;
        const poll = async () => {
            try {
                const matches = await client.getMatches(tournament.id);
                const m = matches.find(
                    (x) => x.round === onChainRound && x.matchIndex === match.position,
                );
                if (active && m?.dathostServerConnect) setConnect(m.dathostServerConnect);
            } catch {
                /* keep polling */
            }
        };
        void poll();
        const id = setInterval(poll, 10_000);
        return () => {
            active = false;
            clearInterval(id);
        };
    }, [connect, tournament.id, onChainRound, match.position]);

    async function launch() {
        if (!wallet || !address) {
            toast.error("Connect your wallet to continue");
            return;
        }
        const client = getIndexerClient();
        if (!client) {
            toast.error("Indexer not configured");
            return;
        }
        setPending(true);
        try {
            const message = `bracketchain:launch-cs2:${tournament.id}:${bracket}:${onChainRound}:${match.position}`;
            const { signature } = await signMessage({
                message: new TextEncoder().encode(message),
                wallet,
            });
            const sig = getBase58Decoder().decode(signature);

            const res = await client.launchCs2Match({
                tournamentAddress: tournament.id,
                round: onChainRound,
                matchIndex: match.position,
                bracket,
                wallet: address,
                sig,
            });

            if (res.status === "queued") {
                setQueued(true);
                toast.info("Server busy — match queued. It launches when the current match ends.");
            } else {
                setConnect(res.connect);
                toast.success("CS2 server launched — share the connect link with both players.");
                onLaunched?.();
            }
        } catch (err) {
            const msg = (err as Error)?.message?.toLowerCase() ?? "";
            if (msg.includes("reject") || msg.includes("denied")) {
                toast.info("Signature request cancelled");
            } else {
                toast.error((err as Error)?.message || "Could not launch server");
            }
        } finally {
            setPending(false);
        }
    }

    async function copyConnect() {
        if (!connect) return;
        try {
            await navigator.clipboard.writeText(`connect ${connect}`);
            toast.success("Connect command copied");
        } catch {
            toast.info(`connect ${connect}`);
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(102,192,244,0.05)", border: "1px solid rgba(102,192,244,0.2)", borderRadius: 8, padding: "12px 14px" }}>
                <Server style={{ width: 16, height: 16, color: "#66c0f4", flexShrink: 0, marginTop: 2 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "#66c0f4" }}>CS2 server</p>
                    <p style={{ ...helperText, color: "rgba(240,241,245,0.65)" }}>
                        The organizer launches the DatHost server for this match; both players join directly via Steam. The result is reported automatically when the match ends.
                    </p>
                </div>
            </div>

            {!connect && isOrganizer && (
                <Button onClick={launch} disabled={pending || queued}>
                    {pending ? <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" /> : <Server style={{ width: 14, height: 14, marginRight: 6 }} />}
                    {queued ? "Queued — waiting for server" : "Launch CS2 server"}
                </Button>
            )}

            {!connect && !isOrganizer && (
                <p style={helperText}>Waiting for the organizer to launch the server.</p>
            )}

            {connect && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={sectionLabel}>Join the server</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                        <div style={{ ...fieldShell, flex: 1, display: "flex", alignItems: "center" }}>connect {connect}</div>
                        <button
                            type="button"
                            onClick={copyConnect}
                            title="Copy connect command"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "0 14px", color: "rgba(240,241,245,0.85)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: "0.78rem" }}
                        >
                            <Copy style={{ width: 14, height: 14 }} />
                            Copy
                        </button>
                    </div>
                    <a href={`steam://connect/${connect}`} style={{ textDecoration: "none" }}>
                        <Button style={{ width: "100%" }}>
                            <Swords style={{ width: 14, height: 14, marginRight: 6 }} />
                            Join Server
                        </Button>
                    </a>
                    <p style={helperText}>
                        Opens CS2 and connects to the match server. If the button doesn&apos;t launch the game, paste <code style={{ fontFamily: "'DM Mono', monospace" }}>connect {connect}</code> into the CS2 console.
                    </p>
                </div>
            )}
        </div>
    );
}
