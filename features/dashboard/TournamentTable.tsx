"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardTournament } from "@/hooks/useDashboard";
import { ROUTES, SOLANA } from "@/constants/links";
import Link from "next/link";

type SortKey =
    | "name"
    | "status"
    | "participantCount"
    | "prizePoolUsdc"
    | "createdAt";

type SortDir = "asc" | "desc";

const STATUS_STYLES: Record<string, React.CSSProperties> = {
    Registration: { background: "rgba(34,212,126,0.08)", color: "#22d47e", border: "1px solid rgba(34,212,126,0.2)" },
    PendingBracketInit: { background: "rgba(245,166,35,0.08)", color: "#f5a623", border: "1px solid rgba(245,166,35,0.2)" },
    Active: { background: "rgba(34,212,126,0.08)", color: "#22d47e", border: "1px solid rgba(34,212,126,0.2)" },
    Completed: { background: "rgba(255,255,255,0.05)", color: "rgba(240,241,245,0.35)", border: "1px solid rgba(255,255,255,0.08)" },
    Cancelled: { background: "rgba(240,78,102,0.08)", color: "#f04e66", border: "1px solid rgba(240,78,102,0.2)" },
};

const STATUS_LABELS: Record<string, string> = {
    Registration: "Registration",
    PendingBracketInit: "Starting…",
    Active: "Active",
    Completed: "Completed",
    Cancelled: "Cancelled",
};

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatMoney(value: number) {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function getSortableValue(t: DashboardTournament, key: SortKey) {
    switch (key) {
        case "createdAt": return new Date(t.createdAt).getTime();
        case "name": return t.name.toLowerCase();
        case "status": return t.status;
        case "participantCount": return t.participantCount;
        case "prizePoolUsdc": return t.prizePoolUsdc;
        default: return "";
    }
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
    if (col !== sortKey) return <ArrowUpDown style={{ width: 12, height: 12, opacity: 0.25 }} />;
    return sortDir === "asc"
        ? <ArrowUp style={{ width: 12, height: 12, color: "#22d47e" }} />
        : <ArrowDown style={{ width: 12, height: 12, color: "#22d47e" }} />;
}

function ColHeader({ label, col, onSort, sortKey, sortDir }: {
    label: string; col: SortKey; onSort: (k: SortKey) => void; sortKey: SortKey; sortDir: SortDir;
}) {
    return (
        <th
            onClick={() => onSort(col)}
            style={{
                padding: "10px 16px",
                textAlign: "left",
                fontSize: "0.68rem",
                fontFamily: "'DM Mono', monospace",
                fontWeight: 500,
                color: "rgba(240,241,245,0.3)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: "pointer",
                userSelect: "none",
                whiteSpace: "nowrap",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {label}
                <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
            </div>
        </th>
    );
}

interface Props {
    tournaments: DashboardTournament[];
    onManage: (id: string) => void;
}

export function TournamentTable({ tournaments, onManage }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>("createdAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    function toggleSort(key: SortKey) {
        if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
    }

    const sorted = useMemo(() => {
        return [...tournaments].sort((a, b) => {
            const av = getSortableValue(a, sortKey);
            const bv = getSortableValue(b, sortKey);
            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
    }, [tournaments, sortKey, sortDir]);

    const cardStyle: React.CSSProperties = {
        background: "rgba(13,15,24,0.85)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        overflow: "hidden",
    };

    return (
        <div style={cardStyle}>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                            <ColHeader label="Name" col="name" onSort={toggleSort} sortKey={sortKey} sortDir={sortDir} />
                            <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "0.68rem", fontFamily: "'DM Mono', monospace", fontWeight: 500, color: "rgba(240,241,245,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Format</th>
                            <ColHeader label="Status" col="status" onSort={toggleSort} sortKey={sortKey} sortDir={sortDir} />
                            <ColHeader label="Participants" col="participantCount" onSort={toggleSort} sortKey={sortKey} sortDir={sortDir} />
                            <ColHeader label="Prize Pool" col="prizePoolUsdc" onSort={toggleSort} sortKey={sortKey} sortDir={sortDir} />
                            <ColHeader label="Created" col="createdAt" onSort={toggleSort} sortKey={sortKey} sortDir={sortDir} />
                            <th style={{ padding: "10px 16px", textAlign: "right", fontSize: "0.68rem", fontFamily: "'DM Mono', monospace", fontWeight: 500, color: "rgba(240,241,245,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((t) => (
                            <tr
                                key={t.address}
                                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                                <td style={{ padding: "12px 16px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.875rem", color: "#f0f1f5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                                            {t.name}
                                        </span>
                                        <a
                                            href={SOLANA.explorerAddr(t.address)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.65rem", fontFamily: "'DM Mono', monospace", color: "rgba(240,241,245,0.25)", textDecoration: "none", transition: "color 0.15s" }}
                                            onMouseEnter={e => (e.currentTarget.style.color = "#22d47e")}
                                            onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,241,245,0.25)")}
                                        >
                                            {t.address.slice(0, 6)}…{t.address.slice(-4)}
                                            <ExternalLink style={{ width: 10, height: 10 }} />
                                        </a>
                                    </div>
                                </td>

                                <td style={{ padding: "12px 16px" }}>
                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", fontWeight: 600, color: "rgba(34,212,126,0.7)", background: "rgba(34,212,126,0.07)", border: "1px solid rgba(34,212,126,0.14)", padding: "2px 8px", borderRadius: 999 }}>
                                        {t.payoutPreset === "WinnerTakesAll" ? "WTA" : t.payoutPreset}
                                    </span>
                                </td>

                                <td style={{ padding: "12px 16px" }}>
                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", fontWeight: 600, padding: "3px 10px", borderRadius: 999, ...(STATUS_STYLES[t.status] ?? STATUS_STYLES.Completed) }}>
                                        {STATUS_LABELS[t.status] ?? t.status}
                                    </span>
                                </td>

                                <td style={{ padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: "rgba(240,241,245,0.55)" }}>
                                    <span style={{ color: "#f0f1f5", fontWeight: 600 }}>{t.participantCount}</span>/{t.maxParticipants}
                                </td>

                                <td style={{ padding: "12px 16px", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "0.9rem", color: "#22d47e" }}>
                                    {formatMoney(t.prizePoolUsdc)}
                                </td>

                                <td style={{ padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "rgba(240,241,245,0.3)" }}>
                                    {formatDate(t.createdAt)}
                                </td>

                                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={ROUTES.tournament(t.address)} target="_blank">View</Link>
                                        </Button>
                                        <Button variant="primary" size="sm" onClick={() => onManage(t.address)}>
                                            Manage
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex flex-col">
                {sorted.map((t) => (
                    <div
                        key={t.address}
                        style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 12 }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "#f0f1f5" }}>{t.name}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", fontWeight: 600, color: "rgba(34,212,126,0.7)", background: "rgba(34,212,126,0.07)", border: "1px solid rgba(34,212,126,0.14)", padding: "2px 6px", borderRadius: 999 }}>
                                        {t.payoutPreset === "WinnerTakesAll" ? "WTA" : t.payoutPreset}
                                    </span>
                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", fontWeight: 600, padding: "2px 8px", borderRadius: 999, ...(STATUS_STYLES[t.status] ?? STATUS_STYLES.Completed) }}>
                                        {STATUS_LABELS[t.status] ?? t.status}
                                    </span>
                                </div>
                            </div>
                            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 3 }}>
                                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#22d47e" }}>{formatMoney(t.prizePoolUsdc)}</span>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "rgba(240,241,245,0.3)" }}>{formatDate(t.createdAt)}</span>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "rgba(240,241,245,0.4)" }}>
                                <span style={{ color: "#f0f1f5", fontWeight: 600 }}>{t.participantCount}</span>/{t.maxParticipants} players
                            </span>
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={ROUTES.tournament(t.address)}>View</Link>
                                </Button>
                                <Button variant="primary" size="sm" onClick={() => onManage(t.address)}>
                                    Manage
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
