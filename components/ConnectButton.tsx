"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut, ChevronDown, Copy, Check } from "lucide-react";
import { ROUTES } from "@/constants/links";
import { Button } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { shortenAddress } from "@/lib/format";
import { getUserIdentity } from "@/lib/privyAuth";

export function ConnectButton() {
    const { login, logout, authenticated, ready, user } = usePrivy();
    // Single source of truth for the active wallet — same address the rest of
    // the app uses for balance, signing and join gating (see useActiveWallet).
    const { address: pubkey } = useActiveWallet();

    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (copyTimer.current) clearTimeout(copyTimer.current);
    }, []);

    async function copyAddress(addr: string) {
        try {
            await navigator.clipboard.writeText(addr);
            setCopied(true);
            if (copyTimer.current) clearTimeout(copyTimer.current);
            copyTimer.current = setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard API unavailable (insecure context / denied) — no-op.
        }
    }

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }

        document.addEventListener("mousedown", onClickOutside);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onClickOutside);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    // Privy hasn't hydrated yet — render a neutral placeholder so we don't
    // flash the "Login / Signup" button for an already-authenticated user.
    if (!ready) {
        return (
            <Button variant="primary" disabled style={{ opacity: 0.6 }}>
                Loading…
            </Button>
        );
    }

    // Not authenticated.
    if (!authenticated) {
        return (
            <Button variant="primary" onClick={login}>
                Login / Signup
            </Button>
        );
    }

    // Display identity for the dropdown — extraction branches live in
    // lib/privyAuth.ts, kept in sync with the enabled login methods.
    const { email, phone } = getUserIdentity(user);

    const display =
        email ||
        phone ||
        (pubkey ? shortenAddress(pubkey) : null) ||
        "Account";

    return (
        <div style={{ position: "relative" }} ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Account menu"
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "7px 14px",
                    background: "rgba(34,212,126,0.10)",
                    border: "1px solid rgba(34,212,126,0.30)",
                    borderRadius: 8,
                    color: "#86efac",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    cursor: "pointer",
                }}
            >
                <span
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#22d47e",
                    }}
                />

                {display}

                <ChevronDown
                    size={13}
                    style={{
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "0.2s",
                    }}
                />
            </button>

            {open && (
                <div
                    role="menu"
                    style={{
                        position: "absolute",
                        right: 0,
                        top: "calc(100% + 8px)",
                        width: 200,
                        background: "#0d0f18",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        padding: "6px",
                        zIndex: 100,
                    }}
                >
                    {/* Dashboard */}
                    <Link
                        href={ROUTES.dashboard}
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "9px 12px",
                            color: "rgba(240,241,245,0.7)",
                            textDecoration: "none",
                        }}
                    >
                        <LayoutDashboard size={14} style={{ color: "#22d47e" }} />
                        Dashboard
                    </Link>

                    <div
                        style={{
                            height: 1,
                            background: "rgba(255,255,255,0.05)",
                            margin: "3px 8px",
                        }}
                    />

                    {/* Account identity + click-to-copy wallet address */}
                    <div
                        style={{
                            padding: "8px 12px",
                            fontSize: "0.75rem",
                            color: "rgba(255,255,255,0.6)",
                            wordBreak: "break-word",
                        }}
                    >
                        {email && <div>Email: {email}</div>}
                        {phone && <div>Phone: {phone}</div>}
                        {pubkey && (
                            <button
                                type="button"
                                onClick={() => copyAddress(pubkey)}
                                title={copied ? "Copied!" : "Copy address"}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    width: "100%",
                                    marginTop: 2,
                                    padding: 0,
                                    border: "none",
                                    background: "transparent",
                                    color: "rgba(255,255,255,0.6)",
                                    fontSize: "0.75rem",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    wordBreak: "break-all",
                                }}
                            >
                                <span style={{ flex: 1 }}>Wallet: {pubkey}</span>
                                {copied ? (
                                    <Check size={13} style={{ color: "#22d47e", flexShrink: 0 }} />
                                ) : (
                                    <Copy size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
                                )}
                            </button>
                        )}
                    </div>

                    <div
                        style={{
                            height: 1,
                            background: "rgba(255,255,255,0.05)",
                            margin: "3px 8px",
                        }}
                    />

                    {/* Logout */}
                    <button
                        role="menuitem"
                        onClick={() => {
                            logout();
                            setOpen(false);
                        }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "9px 12px",
                            border: "none",
                            background: "transparent",
                            color: "rgba(240,100,100,0.75)",
                            cursor: "pointer",
                            textAlign: "left",
                        }}
                    >
                        <LogOut size={14} /> Logout
                    </button>
                </div>
            )}
        </div>
    );
}