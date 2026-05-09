"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { LayoutDashboard, LogOut, ChevronDown } from "lucide-react";
import { ROUTES } from "@/constants/links";

export function ConnectButton() {
    const { setVisible } = useWalletModal();
    const { connected, publicKey, disconnect } = useWallet();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    if (connected && publicKey) {
        const addr = `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`;
        return (
            <div style={{ position: "relative" }} ref={ref}>
                <button
                    onClick={() => setOpen((v) => !v)}
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
                        transition: "background 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(34,212,126,0.18)";
                        e.currentTarget.style.borderColor = "rgba(34,212,126,0.50)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(34,212,126,0.10)";
                        e.currentTarget.style.borderColor = "rgba(34,212,126,0.30)";
                    }}
                >
                    <span
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#22d47e",
                            boxShadow: "0 0 6px #22d47e",
                            flexShrink: 0,
                        }}
                    />
                    {addr}
                    <ChevronDown
                        size={13}
                        style={{
                            transition: "transform 0.2s",
                            transform: open ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                    />
                </button>

                {open && (
                    <div
                        style={{
                            position: "absolute",
                            right: 0,
                            top: "calc(100% + 8px)",
                            width: 180,
                            background: "rgba(3, 7, 5, 0.8)",
                            backdropFilter: "blur(12px)",
                            WebkitBackdropFilter: "blur(12px)",
                            border: "1px solid rgba(13, 167, 26, 0.08)",
                            borderRadius: 12,
                            padding: "6px",
                            zIndex: 100,
                            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)",
                        }}
                    >
                        <Link
                            href={ROUTES.dashboard}
                            onClick={() => setOpen(false)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "9px 12px",
                                borderRadius: 7,
                                color: "rgba(240,241,245,0.7)",
                                fontSize: "0.83rem",
                                textDecoration: "none",
                                transition: "background 0.12s, color 0.12s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                e.currentTarget.style.color = "#f0f1f5";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "rgba(240,241,245,0.7)";
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
                        <button
                            onClick={() => { disconnect(); setOpen(false); }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                width: "100%",
                                padding: "9px 12px",
                                borderRadius: 7,
                                color: "rgba(240,100,100,0.75)",
                                fontSize: "0.83rem",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                transition: "background 0.12s, color 0.12s",
                                textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(240,78,102,0.08)";
                                e.currentTarget.style.color = "#f04e66";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "rgba(240,100,100,0.75)";
                            }}
                        >
                            <LogOut size={14} />
                            Disconnect
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={() => setVisible(true)}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
                background: "#22d47e",
                color: "#06070b",
                border: "none",
                borderRadius: 8,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "background 0.15s, box-shadow 0.15s",
                boxShadow: "0 0 16px rgba(34,212,126,0.30)",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = "#16c062";
                e.currentTarget.style.boxShadow = "0 0 24px rgba(34,212,126,0.50)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = "#22d47e";
                e.currentTarget.style.boxShadow = "0 0 16px rgba(34,212,126,0.30)";
            }}
        >
            Connect Wallet
        </button>
    );
}