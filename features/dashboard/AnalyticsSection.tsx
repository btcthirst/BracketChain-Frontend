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

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                background: "rgba(13,15,24,0.85)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "16px 20px",
            }}
        >
            <span
                style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.65rem",
                    fontWeight: 500,
                    color: "rgba(240,241,245,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                }}
            >
                {label}
            </span>
            <span
                style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: "1.5rem",
                    color: "#f0f1f5",
                    letterSpacing: "-0.02em",
                }}
            >
                {value}
            </span>
        </div>
    );
}

function buildChartData(tournaments: DashboardTournament[]) {
    const byMonth: Record<string, number> = {};
    for (const t of tournaments) {
        const d = new Date(t.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        byMonth[key] = (byMonth[key] ?? 0) + t.prizePoolUsdc;
    }
    return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, volume]) => ({
            month: month.slice(5) + "/" + month.slice(2, 4),
            volume: parseFloat(volume.toFixed(2)),
        }));
}

const darkCard: React.CSSProperties = {
    background: "rgba(13,15,24,0.85)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: "20px",
};

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
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart2 style={{ width: 18, height: 18, color: "rgba(34,212,126,0.5)" }} />
                <h2
                    style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: "#f0f1f5",
                        letterSpacing: "-0.01em",
                    }}
                >
                    Analytics
                </h2>
            </div>

            {/* Summary metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                <Metric label="Total Tournaments" value={String(tournaments.length)} />
                <Metric label="Total Volume"      value={`$${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
                <Metric label="Total Participants" value={String(totalParticipants)} />
                <Metric label="Completion Rate"   value={`${completionRate}%`} />
            </div>

            {/* Revenue breakdown */}
            <div style={darkCard}>
                <h3
                    style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: "#f0f1f5",
                        marginBottom: 16,
                    }}
                >
                    Revenue Breakdown
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "rgba(240,241,245,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Protocol Fees (3.5%)
                        </span>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "#f04e66" }}>
                            −${feesPaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "rgba(240,241,245,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Net to Winners
                        </span>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "#22d47e" }}>
                            ${(totalVolume - feesPaid).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Volume chart */}
            {chartData.length > 0 ? (
                <div style={{ ...darkCard, paddingBottom: 8 }}>
                    <h3
                        style={{
                            fontFamily: "'Syne', sans-serif",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            color: "#f0f1f5",
                            marginBottom: 20,
                        }}
                    >
                        Tournament Volume Over Time
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 11, fill: "rgba(240,241,245,0.3)", fontFamily: "'DM Mono', monospace" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: "rgba(240,241,245,0.3)", fontFamily: "'DM Mono', monospace" }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={v => `$${v}`}
                            />
                            <Tooltip
                                formatter={(v: number) => [`$${v.toLocaleString()} USDC`, "Volume"]}
                                contentStyle={{
                                    fontSize: 12,
                                    borderRadius: 8,
                                    background: "rgba(13,15,24,0.95)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "#f0f1f5",
                                    fontFamily: "'DM Mono', monospace",
                                }}
                                labelStyle={{ color: "rgba(240,241,245,0.5)" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="volume"
                                stroke="#22d47e"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "#22d47e", strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: "#22d47e", stroke: "rgba(34,212,126,0.3)", strokeWidth: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div
                    style={{
                        ...darkCard,
                        textAlign: "center",
                        padding: "32px 20px",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.8rem",
                        color: "rgba(240,241,245,0.25)",
                    }}
                >
                    Chart will appear once you have tournament data.
                </div>
            )}
        </div>
    );
}
