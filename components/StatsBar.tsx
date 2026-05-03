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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function StatSkeleton() {
    return (
        <div className="text-center flex flex-col items-center gap-2">
            <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
        </div>
    );
}

// ── Error fallback ────────────────────────────────────────────────────────────

function StatsError({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="col-span-2 lg:col-span-4 flex flex-col items-center gap-3 py-2">
            <p className="text-gray-500 text-sm">Unable to load stats.</p>
            <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
                <RefreshCw className="w-4 h-4" />
                Try again
            </button>
        </div>
    );
}

// ── Zero-state CTA (shows when all metrics are 0 — pre-launch) ───────────────

function ZeroStateCta() {
    return (
        <div className="col-span-2 lg:col-span-4 flex flex-col items-center gap-2 pt-4">
            <p className="text-sm text-gray-500">
                No tournaments yet —{" "}
                <Link
                    href={ROUTES.create}
                    className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                    be the first to create one
                </Link>
            </p>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function StatsBar() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.5 });
    const { state, refresh } = useStats();

    // All metrics are zero → show pre-launch helper text
    const isAllZero =
        state.status === "success" &&
        STAT_CONFIG.every(s => state.data[s.key] === 0);

    return (
        <section ref={ref} className="bg-gray-100 py-12">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">

                    {/* Loading */}
                    {state.status === "loading" && (
                        STAT_CONFIG.map(s => <StatSkeleton key={s.key} />)
                    )}

                    {/* Error */}
                    {state.status === "error" && (
                        <StatsError onRetry={refresh} />
                    )}

                    {/* Success — show metrics regardless of value */}
                    {state.status === "success" && (
                        STAT_CONFIG.map((stat, index) => (
                            <motion.div
                                key={stat.key}
                                initial={{ opacity: 0, y: 20 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="text-center"
                            >
                                <div className="text-4xl font-bold text-gray-900 mb-2">
                                    {stat.prefix}
                                    <AnimatedCounter
                                        value={state.data[stat.key]}
                                        isInView={isInView}
                                    />
                                    {stat.suffix}
                                </div>
                                <div className="text-gray-600 font-medium">{stat.label}</div>
                            </motion.div>
                        ))
                    )}

                </div>

                {/* Zero-state CTA — rendered below the metrics row */}
                {isAllZero && <ZeroStateCta />}
            </div>
        </section>
    );
}
