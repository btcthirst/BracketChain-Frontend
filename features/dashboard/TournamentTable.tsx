"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
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

const STATUS_STYLES: Record<string, string> = {
    Registration: "bg-green-100 text-green-700",
    PendingBracketInit: "bg-yellow-100 text-yellow-700",
    Active: "bg-blue-100 text-blue-700",
    Completed: "bg-gray-100 text-gray-600",
    Cancelled: "bg-red-100 text-red-500",
};

const STATUS_LABELS: Record<string, string> = {
    Registration: "Registration",
    PendingBracketInit: "Starting…",
    Active: "Active",
    Completed: "Completed",
    Cancelled: "Cancelled",
};

/* ---------------- utils ---------------- */

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatMoney(value: number) {
    return `$${value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
    })}`;
}

function getSortableValue(t: DashboardTournament, key: SortKey) {
    switch (key) {
        case "createdAt":
            return new Date(t.createdAt).getTime();

        case "name":
            return t.name.toLowerCase();

        case "status":
            return t.status;

        case "participantCount":
            return t.participantCount;

        case "prizePoolUsdc":
            return t.prizePoolUsdc;

        default:
            return "";
    }
}

/* ---------------- components ---------------- */

function SortIcon({
    col,
    sortKey,
    sortDir,
}: {
    col: SortKey;
    sortKey: SortKey;
    sortDir: SortDir;
}) {
    if (col !== sortKey) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? (
        <ArrowUp className="w-3 h-3 text-blue-600" />
    ) : (
        <ArrowDown className="w-3 h-3 text-blue-600" />
    );
}

function ColHeader({
    label,
    col,
    onSort,
    sortKey,
    sortDir,
}: {
    label: string;
    col: SortKey;
    onSort: (key: SortKey) => void;
    sortKey: SortKey;
    sortDir: SortDir;
}) {
    return (
        <th
            onClick={() => onSort(col)}
            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer select-none"
        >
            <div className="flex items-center gap-1">
                {label}
                <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
            </div>
        </th>
    );
}

/* ---------------- main ---------------- */

interface Props {
    tournaments: DashboardTournament[];
    onManage: (id: string) => void;
}

export function TournamentTable({ tournaments, onManage }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>("createdAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    function toggleSort(key: SortKey) {
        if (key === sortKey) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
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

    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                            <ColHeader {...{ label: "Name", col: "name", onSort: toggleSort, sortKey, sortDir }} />
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Format</th>
                            <ColHeader {...{ label: "Status", col: "status", onSort: toggleSort, sortKey, sortDir }} />
                            <ColHeader {...{ label: "Participants", col: "participantCount", onSort: toggleSort, sortKey, sortDir }} />
                            <ColHeader {...{ label: "Prize Pool", col: "prizePoolUsdc", onSort: toggleSort, sortKey, sortDir }} />
                            <ColHeader {...{ label: "Created", col: "createdAt", onSort: toggleSort, sortKey, sortDir }} />
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                        {sorted.map((t) => (
                            <tr key={t.address} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
                                            {t.name}
                                        </span>

                                        <a
                                            href={SOLANA.explorerAddr(t.address)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[10px] font-mono text-gray-400 hover:text-blue-600"
                                        >
                                            {t.address.slice(0, 6)}…{t.address.slice(-4)}
                                            <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                    </div>
                                </td>

                                <td className="px-4 py-3">
                                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {t.payoutPreset === "WinnerTakesAll" ? "WTA" : t.payoutPreset}
                                    </span>
                                </td>

                                <td className="px-4 py-3">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[t.status] ?? "bg-gray-100 text-gray-500"}`}>
                                        {STATUS_LABELS[t.status] ?? t.status}
                                    </span>
                                </td>

                                <td className="px-4 py-3 text-sm text-gray-700">
                                    {t.participantCount}/{t.maxParticipants}
                                </td>

                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {formatMoney(t.prizePoolUsdc)}
                                </td>

                                <td className="px-4 py-3 text-xs text-gray-400">
                                    {formatDate(t.createdAt)}
                                </td>

                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Link
                                            href={ROUTES.tournament(t.address)}
                                            target="_blank"
                                            className="text-xs text-gray-400 border px-3 py-1.5 rounded-lg"
                                        >
                                            View
                                        </Link>

                                        <button
                                            onClick={() => onManage(t.address)}
                                            className="text-xs font-semibold text-white bg-blue-600 px-3 py-1.5 rounded-lg"
                                        >
                                            Manage
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile залишив як є (він нормальний) */}
        </div>
    );
}