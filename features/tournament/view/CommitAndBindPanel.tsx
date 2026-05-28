"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, Radio } from "lucide-react";
import { address } from "@solana/kit";
import {
    bindMatchFeed,
    commitMatchLobby,
} from "@bracketchain/sdk";
import { toast } from "sonner";

import { useBracketChainClient } from "@/lib/sdk";
import { handleTxError } from "@/lib/txErrors";
import { Button } from "@/components/ui/button";
import type { Match, TournamentView } from "@/types/tournament";

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

/**
 * Stage C (V1.2 Oracle) — two-step organizer ceremony that arms an Oracle-mode
 * match for permissionless settlement.
 *
 * 1. **Commit lobby:** roll a random 16-byte `lobby_id`, paste it into the
 *    Dota 2 lobby name, then `commit_match_lobby` snapshots both players'
 *    identity hashes + the off-chain-computed `expected_feed_hash`.
 * 2. **Bind feed:** organizer creates a Switchboard PullFeed via the (future)
 *    feed-factory and pastes its address; `bind_match_feed` cryptographically
 *    binds the feed to the committed identities.
 *
 * After step 2, the oracle-relayer cron is unblocked and the match is in the
 * "awaiting oracle proposal" state rendered by `OraclePendingPanel`.
 *
 * NOTE: the Switchboard feed-factory (SDK side) is gated on external validation
 * #1/#4; until that lands, the feed address must be sourced externally.
 */
export function CommitAndBindPanel({ tournament, match, onSuccess }: Props) {
    const sdk = useBracketChainClient();
    const [submitting, setSubmitting] = useState(false);
    const [lobbyIdBytes] = useState<Uint8Array>(() =>
        match.oracle.lobbyId ? hexToBytes(match.oracle.lobbyId) ?? randomLobbyId() : randomLobbyId(),
    );
    const [lobbyCopied, setLobbyCopied] = useState(false);
    const [feedInput, setFeedInput] = useState("");

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
        // V1.2 supports only a placeholder expected_feed_hash until the
        // feed-factory ships (external validation #4). Use a deterministic
        // hash of the lobby id as a stand-in so commit_match_lobby succeeds;
        // bind_match_feed will reject any real feed until the factory lands.
        const expectedFeedHash = await derivePlaceholderFeedHash(lobbyIdBytes);
        setSubmitting(true);
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

    async function handleBind() {
        if (!sdk) {
            toast.error("Connect your wallet to continue");
            return;
        }
        const trimmed = feedInput.trim();
        let feedAddress;
        try {
            feedAddress = address(trimmed);
        } catch {
            toast.error("Feed address is not a valid Solana pubkey");
            return;
        }
        setSubmitting(true);
        try {
            await bindMatchFeed(sdk, {
                tournamentPda: pda,
                round: onChainRound,
                matchIndex: match.position,
                switchboardFeed: feedAddress,
            });
            toast.success("Feed bound — the oracle relayer will propose the winner once the feed resolves.");
            onSuccess();
        } catch (err) {
            handleTxError(err, "bind_match_feed");
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

            {/* Step 2: feed input + bind */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ ...sectionLabel, opacity: committed ? 1 : 0.4 }}>Step 2 — Switchboard feed address</label>
                {!committed ? (
                    <p style={helperText}>Bind feed unlocks after the lobby commit lands.</p>
                ) : bound ? (
                    <>
                        <div style={fieldShell}>{match.oracle.switchboardFeed}</div>
                        <p style={{ ...helperText, color: "#22d47e", display: "flex", alignItems: "center", gap: 6 }}>
                            <Radio style={{ width: 12, height: 12 }} />
                            Feed bound. Awaiting oracle proposal — the permissionless relayer will fire <code style={{ fontFamily: "'DM Mono', monospace", background: "rgba(34,212,126,0.08)", padding: "0 4px", borderRadius: 4 }}>propose_result_oracle</code> once the feed has enough samples.
                        </p>
                    </>
                ) : (
                    <>
                        <input
                            type="text"
                            value={feedInput}
                            disabled={submitting}
                            placeholder="Switchboard PullFeed address (base58)"
                            onChange={(e) => setFeedInput(e.target.value)}
                            style={{ ...fieldShell, outline: "none" }}
                        />
                        <p style={helperText}>
                            Paste the Switchboard On-Demand feed PDA created by the feed-factory for this match. The program rejects any feed whose <code>feed_hash</code> doesn&apos;t match the committed <code>expected_feed_hash</code>.
                        </p>
                        <Button onClick={handleBind} disabled={submitting || !sdk || feedInput.trim().length === 0}>
                            {submitting ? <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" /> : null}
                            Bind feed
                        </Button>
                    </>
                )}
            </div>
        </>
    );
}

// ── Placeholder feed-hash derivation (V1.2 dev-only) ──────────────────────────
// The real `expected_feed_hash` is SHA-256 over the OracleJob schema (which
// embeds lobby_id + both player_*_game_id). Until the feed-factory ships
// (external validation #1/#4), commit with a deterministic hash of the lobby
// id so the on-chain `commit_match_lobby` succeeds. `bind_match_feed` will
// reject any real Switchboard feed under this placeholder — that's intentional;
// it prevents accidental production use.
async function derivePlaceholderFeedHash(lobbyId: Uint8Array): Promise<Uint8Array> {
    // .slice() copies into a fresh ArrayBuffer (not SharedArrayBuffer),
    // which is what crypto.subtle.digest requires under strict TS DOM types.
    const buf = await crypto.subtle.digest("SHA-256", lobbyId.slice());
    return new Uint8Array(buf);
}
