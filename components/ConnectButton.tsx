"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut, ChevronDown } from "lucide-react";
import { ROUTES } from "@/constants/links";
import { Button } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";

export function ConnectButton() {
    const { login, logout, authenticated, user } = usePrivy();
    const { wallets } = useSolanaWallets();

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

    // 📌 1. Не залогінений
    if (!authenticated) {
        return (
            <Button variant="primary" onClick={login}>
                Login / Signup
            </Button>
        );
    }

    // 📌 2. Витягуємо дані користувача (з підтримкою Google, Apple та linked accounts)
    const email = user?.email?.address || user?.google?.email || user?.apple?.email;
    const phone = user?.phone?.number || user?.telegram?.username;

    // Шукаємо Solana-адресу в усіх можливих місцях:
    // 1. Активні підключені гаманці
    // 2. Первинний гаманець користувача
    // 3. Усі лінковані акаунти
    const getSolanaAddress = () => {
        const activeSolana = wallets.find(
            (w) => w.address && !w.address.startsWith("0x")
        );
        if (activeSolana?.address) return activeSolana.address;

        if (user?.wallet?.address && !user.wallet.address.startsWith("0x")) {
            return user.wallet.address;
        }

        const linkedSolana = user?.linkedAccounts?.find(
            (acc) =>
                acc.type === "wallet" &&
                (acc.chainType === "solana" || (acc.address && !acc.address.startsWith("0x")))
        );
        if (linkedSolana && "address" in linkedSolana) {
            return linkedSolana.address;
        }

        return undefined;
    };

    const pubkey = getSolanaAddress();

    const display =
        email ||
        phone ||
        (pubkey ? `${pubkey.slice(0, 4)}…${pubkey.slice(-4)}` : null) ||
        "Account";

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

                    {/* Wallet info (optional debug / UX) */}
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
                        {pubkey && <div>Wallet: {pubkey}</div>}
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
                        onClick={() => {
                            logout();
                            setOpen(false);
                        }}
                        style={{
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