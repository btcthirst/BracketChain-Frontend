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

    // Close dropdown when clicking outside
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
            <div className="relative" ref={ref}>
                <button
                    onClick={() => setOpen(v => !v)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors text-sm"
                >
                    {addr}
                    <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                        <Link
                            href={ROUTES.player(publicKey.toBase58())}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                {publicKey.toBase58().slice(0, 1)}
                            </div>
                            My Profile
                        </Link>
                        <Link
                            href={ROUTES.dashboard}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <LayoutDashboard className="w-4 h-4 text-blue-600" />
                            Dashboard
                        </Link>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                            onClick={() => { disconnect(); setOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
            Connect Wallet
        </button>
    );
}