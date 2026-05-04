"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import type { PlayerTournamentHistory } from "@/types/player";
import { ROUTES } from "@/constants/links";
import Link from "next/link";

type SortKey = "name" | "date" | "placement" | "prizeWon";
type SortDir = "asc" | "desc";

interface Props {
    history: PlayerTournamentHistory[];
}

export function TournamentHistoryTable({ history }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>("date");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    function toggleSort(key: SortKey) {
        if (key === sortKey) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
        setPage(1);
    }

    const sorted = useMemo(() => {
        return [...history].sort((a, b) => {
            let comparison = 0;
            
            if (sortKey === "date") {
                comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            } else if (sortKey === "prizeWon") {
                comparison = a.prizeWon - b.prizeWon;
            } else if (sortKey === "placement") {
                // Parse "1st", "2nd", "Participant" to numbers for sorting
                const getPlacementNum = (p: string) => {
                    if (!p || p === "Participant") return 999;
                    const num = parseInt(p, 10);
                    return isNaN(num) ? 999 : num;
                };
                comparison = getPlacementNum(String(a.placement)) - getPlacementNum(String(b.placement));
            } else {
                const av = String(a[sortKey]);
                const bv = String(b[sortKey]);
                comparison = av.localeCompare(bv);
            }

            return sortDir === "asc" ? comparison : -comparison;
        });
    }, [history, sortKey, sortDir]);

    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(history.length / pageSize);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                            <ColHeader label="Tournament" col="name" onSort={toggleSort} sortKey={sortKey} sortDir={sortDir} />
                            <ColHeader label="Date" col="date" onSort={toggleSort} sortKey={sortKey} sortDir={sortDir} />
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Format</th>
                            <ColHeader label="Placement" col="placement" onSort={toggleSort} sortKey={sortKey} sortDir={sortDir} />
                            <ColHeader label="Prize" col="prizeWon" onSort={toggleSort} sortKey={sortKey} sortDir={sortDir} />
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Game</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginated.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-4">
                                    <Link 
                                        href={ROUTES.tournament(item.id)}
                                        className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        {item.name}
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-500">
                                    {new Date(item.date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-4">
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {item.format}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                        item.placement === "1st" ? "bg-yellow-100 text-yellow-700" :
                                        item.placement === "2nd" ? "bg-gray-100 text-gray-700" :
                                        item.placement === "3rd" ? "bg-orange-100 text-orange-700" :
                                        "bg-blue-50 text-blue-600"
                                    }`}>
                                        {item.placement}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-sm font-bold text-gray-900">
                                    {item.prizeWon > 0 ? `$${item.prizeWon.toLocaleString()}` : "—"}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-500">
                                    {item.game}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-500">
                        Page {page} of {totalPages}
                    </span>
                    <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

function ColHeader({ label, col, onSort, sortKey, sortDir }: { 
    label: string; 
    col: SortKey; 
    onSort: (key: SortKey) => void; 
    sortKey: SortKey; 
    sortDir: SortDir;
}) {
    return (
        <th 
            onClick={() => onSort(col)}
            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer select-none group"
        >
            <div className="flex items-center gap-1">
                {label}
                <div className={`transition-opacity ${col === sortKey ? "opacity-100" : "opacity-0 group-hover:opacity-30"}`}>
                    {col === sortKey && sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : 
                     col === sortKey && sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : 
                     <ArrowUpDown className="w-3 h-3" />}
                </div>
            </div>
        </th>
    );
}
