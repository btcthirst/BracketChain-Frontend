"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useStats } from "@/hooks/useStats";
import type { StatsData } from "@/hooks/useStats";
import { AnimatedCounter } from "./AnimatedCounter";
import { ROUTES } from "@/constants/links";

interface StatConfig {
    label: string;
    key: keyof StatsData;
    prefix?: string;
    suffix?: string;
}

const STAT_CONFIG: StatConfig[] = [
    { label: "Tournaments Created", key: "tournamentsCreated" },
    { label: "Total Prize Volume", key: "totalPrizeVolume", prefix: "$" },
    { label: "Games Integrated", key: "gamesIntegrated" },
    { label: "Avg Payout Time", key: "avgPayoutSeconds", suffix: "s" },
];

function StatSkeleton() {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div
                style={{
                    height: 36,
                    width: 110,
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 6,
                    animation: "pulse 1.5s ease-in-out infinite",
                }}
            />
            <div
                style={{
                    height: 12,
                    width: 130,
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 4,
                    animation: "pulse 1.5s ease-in-out infinite",
                    animationDelay: "0.15s",
                }}
            />
        </div>
    );
}

function StatsError({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            style={{
                gridColumn: "1 / -1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
            }}
        >
            <p style={{ fontSize: "0.8rem", color: "rgba(240,241,245,0.3)" }}>
                Unable to load stats.
            </p>
            <button
                onClick={onRetry}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: "rgba(34,212,126,0.7)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#22d47e"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(34,212,126,0.7)"; }}
            >
                <RefreshCw size={13} />
                Try again
            </button>
        </div>
    );
}

function ZeroStateCta() {
    return (
        <div
            style={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "center",
                paddingTop: 12,
            }}
        >
            <p style={{ fontSize: "0.8rem", color: "rgba(240,241,245,0.3)" }}>
                No tournaments yet —{" "}
                <Link
                    href={ROUTES.create}
                    style={{
                        color: "#22d47e",
                        fontWeight: 600,
                        textDecoration: "none",
                    }}
                >
                    be the first to create one
                </Link>
            </p>
        </div>
    );
}

export function StatsBar() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.5 });
    const { state, refresh } = useStats();

    const isAllZero =
        state.status === "success" &&
        STAT_CONFIG.every((s) => state.data[s.key] === 0);

    return (
        <section
            ref={ref}
            style={{
                background: "transparent",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                padding: "60px 0",
            }}
        >
            <div
                style={{
                    maxWidth: 1120,
                    margin: "0 auto",
                    padding: "0 24px",
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 24,
                }}
                className="grid-cols-2 md:grid-cols-4"
            >
                {state.status === "loading" &&
                    STAT_CONFIG.map((s) => <StatSkeleton key={s.key} />)}

                {state.status === "error" && <StatsError onRetry={refresh} />}

                {state.status === "success" &&
                    STAT_CONFIG.map((stat, index) => (
                        <motion.div
                            key={stat.key}
                            initial={{ opacity: 0, y: 16 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: index * 0.08 }}
                            style={{ textAlign: "center" }}
                        >
                            <div
                                style={{
                                    fontFamily: "'Syne', sans-serif",
                                    fontWeight: 700,
                                    fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                                    color: "#22d47e",
                                    letterSpacing: "-0.03em",
                                    marginBottom: 4,
                                    lineHeight: 1,
                                }}
                            >
                                {stat.prefix}
                                <AnimatedCounter value={state.data[stat.key]} isInView={isInView} />
                                {stat.suffix}
                            </div>
                            <div
                                style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "0.68rem",
                                    color: "rgba(240,241,245,0.3)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                }}
                            >
                                {stat.label}
                            </div>
                        </motion.div>
                    ))}
            </div>

            {isAllZero && <ZeroStateCta />}
        </section>
    );
}