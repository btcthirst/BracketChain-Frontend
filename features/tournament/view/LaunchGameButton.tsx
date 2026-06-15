"use client";

import { useEffect, useState } from "react";
import { Copy, Crown, Gamepad2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { steamLaunchUrl, gameLabel } from "@/constants/games";

async function passKeyFromLobbyHex(lobbyHex: string): Promise<string | null> {
    if (!/^[0-9a-f]{32}$/i.test(lobbyHex)) return null;
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        bytes[i] = parseInt(lobbyHex.slice(i * 2, i * 2 + 2), 16);
    }
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return hex.slice(0, 8);
}

async function copy(value: string, label: string) {
    try {
        await navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
    } catch {
        toast.info(`${label}: ${value}`);
    }
}

const fieldRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.74rem",
    color: "rgba(240,241,245,0.85)",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "8px 10px",
};

const fieldLabel: React.CSSProperties = {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "0.62rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "rgba(240,241,245,0.5)",
};

export function LaunchGameButton({
    game,
    lobbyId,
    iAmHost,
}: {
    game: string;
    /** Committed lobby id (32-char hex) of the player's current match, when known. */
    lobbyId?: string | null;
    /**
     * True when the viewer is playerA of the match — the designated lobby host.
     * Determines the create-vs-join copy. Undefined falls back to symmetric
     * instructions. Both clients derive this from the same on-chain seating, so
     * exactly one player is told to create.
     */
    iAmHost?: boolean;
}) {
    const url = steamLaunchUrl(game);
    const [passKey, setPassKey] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        // passKeyFromLobbyHex returns null for empty/invalid input, so the
        // async path also covers "no lobby" — no synchronous setState in the
        // effect body (react-hooks/set-state-in-effect).
        void passKeyFromLobbyHex(lobbyId ?? "").then((k) => {
            if (active) setPassKey(k);
        });
        return () => {
            active = false;
        };
    }, [lobbyId]);

    if (!url) return null;

    function handleLaunch() {
        window.location.href = url!;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Button variant="outline" size="lg" className="w-full" onClick={handleLaunch}>
                <Gamepad2 />
                Launch {gameLabel(game)}
            </Button>

            {lobbyId ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "0.74rem",
                            lineHeight: 1.5,
                            color: "rgba(240,241,245,0.6)",
                        }}
                    >
                        {iAmHost ? (
                            <Crown style={{ width: 14, height: 14, color: "#f5a623", flexShrink: 0, marginTop: 2 }} />
                        ) : (
                            <Search style={{ width: 14, height: 14, color: "rgba(240,241,245,0.5)", flexShrink: 0, marginTop: 2 }} />
                        )}
                        <span>
                            {iAmHost === true
                                ? "You host this match. In Dota: Play → Custom Lobby → Create, with the name and password below (mode 1v1 Mid)."
                                : iAmHost === false
                                  ? "Your opponent hosts. In Dota: Play → Custom Lobby, search the name below, enter the password, and join."
                                  : "One of you creates a Custom Lobby with the name + password below; the other searches the name and joins."}
                        </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={fieldLabel}>Lobby name</span>
                        <div style={fieldRow}>
                            <span style={{ flex: 1, wordBreak: "break-all" }}>{lobbyId}</span>
                            <button
                                type="button"
                                aria-label="Copy lobby name"
                                onClick={() => copy(lobbyId, "Lobby name")}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,241,245,0.5)", padding: 0, display: "flex" }}
                            >
                                <Copy style={{ width: 14, height: 14 }} />
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={fieldLabel}>Password</span>
                        <div style={fieldRow}>
                            <span style={{ flex: 1 }}>{passKey ?? "…"}</span>
                            {passKey && (
                                <button
                                    type="button"
                                    aria-label="Copy password"
                                    onClick={() => copy(passKey, "Password")}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,241,245,0.5)", padding: 0, display: "flex" }}
                                >
                                    <Copy style={{ width: 14, height: 14 }} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", textAlign: "center", color: "rgba(240,241,245,0.3)" }}>
                    Opens via Steam — make sure Steam is running.
                </p>
            )}
        </div>
    );
}
