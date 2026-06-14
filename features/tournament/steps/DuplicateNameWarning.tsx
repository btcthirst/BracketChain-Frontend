"use client";

import { AlertTriangle } from "lucide-react";
import { useActiveWallet } from "@/hooks/useActiveWallet";

import { useNameCheck } from "@/hooks/useNameCheck";

interface Props {
    name: string;
}

export function DuplicateNameWarning({ name }: Props) {
    const { address } = useActiveWallet();
    const state = useNameCheck(name, address);

    if (state.status === "checking") {
        return (
            <p style={{ fontSize: "0.72rem", color: "rgba(240,241,245,0.3)", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span
                    style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        border: "2px solid rgba(240,241,245,0.15)",
                        borderTopColor: "rgba(240,241,245,0.5)",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                    }}
                />
                Checking name availability…
            </p>
        );
    }

    if (state.status !== "taken") return null;

    return (
        <div
            style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginTop: 6,
                background: "rgba(245,158,11,0.07)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 8,
                padding: "8px 12px",
            }}
        >
            <AlertTriangle size={14} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: "0.75rem", color: "rgba(240,241,245,0.6)", lineHeight: 1.55 }}>
                You already have a tournament named “{name.trim()}”. Its on-chain
                address derives from your wallet + name, so creating another with
                this name will fail. Pick a different name.
            </p>
        </div>
    );
}
