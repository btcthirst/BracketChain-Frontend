"use client";

import { BarChart2 } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import type { DashboardTournament } from "@/hooks/useDashboard";

const PROTOCOL_FEE = 0.035;

interface Props {
    tournaments: DashboardTournament[];
}

// ── Metric card ───────────────────────────────────────────────────────────────

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1 bg-white rounded-xl border border-gray-200 px-5 py-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
            <span className="text-2xl font-bold text-gray-900">{value}</span>
        </div>
    );
}

// ── Volume chart data ─────────────────────────────────────────────────────────

function buildChartData(tournaments: DashboardTournament[]) {
    // Group by month (createdAt)
    const byMonth: Record<string, number> = {};
    for (const t of tournaments) {
        const d = new Date(t.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        byMonth[key] = (byMonth[key] ?? 0) + t.prizePoolUsdc;
    }
    return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, volume]) => ({
            month: month.slice(5) + "/" + month.slice(2, 4), // "MM/YY"
            volume: parseFloat(volume.toFixed(2)),
        }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AnalyticsSection({ tournaments }: Props) {
    const totalVolume = tournaments.reduce((s, t) => s + t.prizePoolUsdc, 0);
    const totalParticipants = tournaments.reduce((s, t) => s + t.participantCount, 0);
    const completed = tournaments.filter(t => t.status === "Completed");
    const completionRate = tournaments.length > 0
        ? Math.round((completed.length / tournaments.length) * 100)
        : 0;
    const feesPaid = totalVolume * PROTOCOL_FEE;

    const chartData = buildChartData(tournaments);

    return (
        <div className="flex flex-col gap-5">

            {/* Header */}
            <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-gray-400" />
                <h2 className="text-base font-semibold text-gray-800">Analytics</h2>
            </div>

            {/* Summary metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Metric label="Total Tournaments" value={String(tournaments.length)} />
                <Metric label="Total Volume" value={`$${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC`} />
                <Metric label="Total Participants" value={String(totalParticipants)} />
                <Metric label="Completion Rate" value={`${completionRate}%`} />
            </div>

            {/* Revenue breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-gray-700">Revenue Breakdown</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-400">Protocol Fees Paid (3.5%)</span>
                        <span className="font-bold text-red-500">
                            −${feesPaid.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-400">Net to Winners</span>
                        <span className="font-bold text-green-600">
                            ${(totalVolume - feesPaid).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
                        </span>
                    </div>
                </div>
            </div>

            {/* Volume over time */}
            {chartData.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 px-5 pt-4 pb-2">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Tournament Volume Over Time</h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 11, fill: "#9ca3af" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: "#9ca3af" }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={v => `$${v}`}
                            />
                            <Tooltip
                                formatter={(v: number) => [`$${v.toLocaleString()} USDC`, "Volume"]}
                                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="volume"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center text-sm text-gray-400">
                    Chart will appear once you have tournament data.
                </div>
            )}
        </div>
    );
}