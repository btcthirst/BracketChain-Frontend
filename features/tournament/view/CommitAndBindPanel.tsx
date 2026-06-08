"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, Radio } from "lucide-react";
import { address } from "@solana/kit";
import { commitMatchLobby, computeDotaFeedHash } from "@bracketchain/sdk";
import { toast } from "sonner";

import { useBracketChainClient } from "@/lib/sdk";
import {
    dotaFeedParams,
    fetchDotaIdentityHash,
    switchboardQueue,
} from "@/lib/switchboardFeed";
import { handleTxError } from "@/lib/txErrors";
import { Button } from "@/components/ui/button";
import type { Match, TournamentView } from "@/types/tournament";
import { BindFeedFlow } from "./BindFeedFlow";

// ── Styling primitives (mirrors ReportResultModal idiom — inline styles) ─────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

// 16 random bytes for `lobby_id` — frontend-generated per decision #3 in the
// Stage-C plan. crypto.getRandomValues is sync + always available in browsers
// (and JSDOM for tests).
function randomLobbyId(): Uint8Array {
    const out = new Uint8Array(16);
    crypto.getRandomValues(out);
    return out;
}

function bytesToHex(b: Uint8Array): string {
    let s = "";
    for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
    return s;
}

function hexToBytes(hex: string): Uint8Array | null {
    const clean = hex.replace(/^0x/, "").trim();
    if (clean.length !== 32 || !/^[0-9a-fA-F]+$/.test(clean)) return null;
    const out = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
    tournament: TournamentView;
    match: Match;
    /** Called after a successful commit OR feed-bind tx so the parent can refresh. */
    onSuccess: () => void;
}

export function CommitAndBindPanel({ tournament, match, onSuccess }: Props) {
    const sdk = useBracketChainClient();
    const [submitting, setSubmitting] = useState(false);
    const [lobbyIdBytes] = useState<Uint8Array>(() =>
        match.oracle.lobbyId ? hexToBytes(match.oracle.lobbyId) ?? randomLobbyId() : randomLobbyId(),
    );
    const [lobbyCopied, setLobbyCopied] = useState(false);

    const committed = match.oracle.lobbyId !== null;
    const bound = match.oracle.switchboardFeed !== null;

    // On-chain rounds are 0-indexed; the UI Match carries the 1-indexed value.
    const onChainRound = match.round - 1;
    const pda = address(tournament.id);

    const lobbyHex = bytesToHex(lobbyIdBytes);

    async function copyLobbyId() {
        try {
            await navigator.clipboard.writeText(lobbyHex);
            setLobbyCopied(true);
            setTimeout(() => setLobbyCopied(false), 1500);
        } catch {
            toast.error("Could not copy lobby id");
        }
    }

    async function handleCommit() {
        if (!sdk) {
            toast.error("Connect your wallet to continue");
            return;
        }
        if (!match.playerA || !match.playerB) {
            toast.error("Match has no players assigned yet");
            return;
        }
        setSubmitting(true);
        let expectedFeedHash: Uint8Array;
        try {
            const [aHash, bHash] = await Promise.all([
                fetchDotaIdentityHash(match.playerA.address),
                fetchDotaIdentityHash(match.playerB.address),
            ]);
            if (!aHash || !bHash) {
                toast.error(
                    "Both players must link Steam before committing an Oracle match.",
                );
                setSubmitting(false);
                return;
            }
            expectedFeedHash = computeDotaFeedHash(
                switchboardQueue(),
                dotaFeedParams(lobbyHex, aHash, bHash),
            );
        } catch (err) {
            toast.error((err as Error).message || "Could not compute feed hash");
            setSubmitting(false);
            return;
        }
        try {
            await commitMatchLobby(sdk, {
                tournamentPda: pda,
                round: onChainRound,
                matchIndex: match.position,
                playerA: address(match.playerA.address),
                playerB: address(match.playerB.address),
                lobbyId: lobbyIdBytes,
                expectedFeedHash,
            });
            toast.success("Lobby committed. Paste the lobby id into the Dota 2 lobby name, then bind the feed below.");
            onSuccess();
        } catch (err) {
            handleTxError(err, "commit_match_lobby");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(34,212,126,0.05)", border: "1px solid rgba(34,212,126,0.2)", borderRadius: 8, padding: "12px 14px" }}>
                <KeyRound style={{ width: 16, height: 16, color: "#22d47e", flexShrink: 0, marginTop: 2 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "#22d47e" }}>Oracle commit ceremony</p>
                    <p style={{ ...helperText, color: "rgba(240,241,245,0.65)" }}>
                        Commit the lobby id, paste it into the Dota 2 lobby name, then bind the Switchboard feed. The relayer will pick up and propose the winner once the feed resolves.
                    </p>
                </div>
            </div>

            {/* Step 1: lobby id + commit */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={sectionLabel}>Step 1 — Lobby ID (paste into Dota 2 lobby name)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                    <div style={{ ...fieldShell, flex: 1, display: "flex", alignItems: "center" }}>0x{lobbyHex}</div>
                    <button
                        type="button"
                        onClick={copyLobbyId}
                        disabled={submitting}
                        title="Copy"
                        style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 8,
                            padding: "0 14px",
                            color: lobbyCopied ? "#22d47e" : "rgba(240,241,245,0.85)",
                            cursor: submitting ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "0.78rem",
                        }}
                    >
                        {lobbyCopied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                        {lobbyCopied ? "Copied" : "Copy"}
                    </button>
                </div>
                {!committed && (
                    <p style={helperText}>
                        Click <strong style={{ color: "rgba(240,241,245,0.85)" }}>Commit lobby</strong> below to snapshot the lobby id + both players&apos; identity hashes on-chain. After committing, paste the id into the Dota 2 lobby name when you create the match.
                    </p>
                )}
                {committed && (
                    <p style={{ ...helperText, color: "#22d47e" }}>
                        ✓ Lobby committed. Paste the id above into the Dota 2 lobby name so the feed can locate the match.
                    </p>
                )}
                {!committed && (
                    <Button onClick={handleCommit} disabled={submitting || !sdk}>
                        {submitting ? <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" /> : null}
                        Commit lobby
                    </Button>
                )}
            </div>

            {/* Step 2: one-click feed creation + bind (Phase 1.5) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ ...sectionLabel, opacity: committed ? 1 : 0.4 }}>Step 2 — Switchboard feed</label>
                {!committed ? (
                    <p style={helperText}>Bind feed unlocks after the lobby commit lands.</p>
                ) : bound ? (
                    <>
                        <div style={fieldShell}>{match.oracle.switchboardFeed}</div>
                        <p style={{ ...helperText, color: "#22d47e", display: "flex", alignItems: "center", gap: 6 }}>
                            <Radio style={{ width: 12, height: 12 }} />
                            Feed bound. Awaiting oracle proposal — the permissionless relayer will fire <code style={{ fontFamily: "'DM Mono', monospace", background: "rgba(34,212,126,0.08)", padding: "0 4px", borderRadius: 4 }}>propose_result_oracle</code> once the match resolves.
                        </p>
                    </>
                ) : (
                    <BindFeedFlow
                        tournament={tournament}
                        match={match}
                        lobbyHex={lobbyHex}
                        onBound={onSuccess}
                    />
                )}
            </div>
        </>
    );
}
