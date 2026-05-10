"use client";

import Link from "next/link";
import { Users, Clock, Trophy, RefreshCw, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionDiv } from "@/components/ui/motion-wraper";
import { ROUTES } from "@/constants/links";
import { useTournaments } from "@/hooks/useTournaments";
import type { Tournament } from "@/hooks/useTournaments";
import { memo } from "react";

function TournamentCardSkeleton() {
    return (
        <div
            style={{
                background: "rgba(13,15,24,0.8)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ height: 14, width: 140, background: "rgba(255,255,255,0.06)", borderRadius: 4 }} />
                    <div style={{ height: 11, width: 80, background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />
                </div>
                <div style={{ height: 20, width: 40, background: "rgba(91,95,239,0.1)", borderRadius: 999 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[0, 1, 2].map((i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ height: 9, width: 52, background: "rgba(255,255,255,0.04)", borderRadius: 3 }} />
                        <div style={{ height: 13, width: 64, background: "rgba(255,255,255,0.06)", borderRadius: 3 }} />
                    </div>
                ))}
            </div>
            <div style={{ height: 2, width: "100%", background: "rgba(255,255,255,0.04)", borderRadius: 999 }} />
        </div>
    );
}

function EmptyState() {
    return (
        <div
            style={{
                gridColumn: "1 / -1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
                padding: "64px 0",
                textAlign: "center",
            }}
        >
            <svg viewBox="0 0 120 80" style={{ width: 120, height: 80, color: "rgba(255,255,255,0.08)" }} fill="none">
                <rect x="4" y="16" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                <rect x="4" y="52" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                <rect x="52" y="34" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                <rect x="92" y="34" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                <path d="M28 22 H40 V58 H28" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M40 40 H52" stroke="currentColor" strokeWidth="2" />
                <path d="M76 40 H92" stroke="currentColor" strokeWidth="2" />
            </svg>
            <div>
                <p style={{ fontSize: "1rem", fontWeight: 600, color: "rgba(240,241,245,0.6)", marginBottom: 6, fontFamily: "'Syne', sans-serif" }}>
                    No tournaments yet
                </p>
                <p style={{ fontSize: "0.83rem", color: "rgba(240,241,245,0.3)", maxWidth: 260, margin: "0 auto" }}>
                    Be the first to create one and start competing on-chain.
                </p>
            </div>
            <Button variant="primary" asChild>
                <Link href={ROUTES.create}>
                    <PlusCircle className="size-[14px]" />
                    Create the first tournament
                </Link>
            </Button>
        </div>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            style={{
                gridColumn: "1 / -1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "64px 0",
                textAlign: "center",
            }}
        >
            <RefreshCw size={24} style={{ color: "rgba(255,255,255,0.15)" }} />
            <p style={{ fontSize: "0.83rem", color: "rgba(240,241,245,0.3)" }}>Unable to load tournaments</p>
            <button
                onClick={onRetry}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 7,
                    color: "rgba(240,241,245,0.5)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                    e.currentTarget.style.color = "rgba(240,241,245,0.8)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.color = "rgba(240,241,245,0.5)";
                }}
            >
                <RefreshCw size={12} />
                Try again
            </button>
        </div>
    );
}

function TournamentCard({ tournament, index }: { tournament: Tournament; index: number }) {
    const fillPct = (tournament.participants / tournament.maxParticipants) * 100;

    return (
        <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: index * 0.07 }}
        >
            <Link
                href={ROUTES.tournament(tournament.id)}
                style={{
                    display: "block",
                    background: "rgba(13,15,24,0.8)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 12,
                    padding: 24,
                    textDecoration: "none",
                    transition: "border-color 0.18s, box-shadow 0.18s",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(34,212,126,0.25)";
                    e.currentTarget.style.boxShadow = "0 0 24px rgba(34,212,126,0.07)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.boxShadow = "none";
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                        <h3
                            style={{
                                fontFamily: "'Syne', sans-serif",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                color: "#f0f1f5",
                                letterSpacing: "-0.01em",
                                marginBottom: 4,
                            }}
                        >
                            {tournament.name}
                        </h3>
                        <p style={{ fontSize: "0.78rem", color: "rgba(240,241,245,0.35)", fontFamily: "'DM Mono', monospace" }}>
                            {tournament.game}
                        </p>
                    </div>
                    <span
                        style={{
                            padding: "3px 10px",
                            background: "rgba(34,212,126,0.08)",
                            border: "1px solid rgba(34,212,126,0.20)",
                            borderRadius: 999,
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "0.68rem",
                            color: "#22d47e",
                            letterSpacing: "0.04em",
                        }}
                    >
                        {tournament.format}
                    </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                    {[
                        { icon: <Trophy size={13} style={{ color: "#f5a623" }} />, label: "Prize Pool", value: `$${tournament.prizePool.toLocaleString()}` },
                        { icon: <Users size={13} style={{ color: "#7c80f5" }} />, label: "Players", value: `${tournament.participants}/${tournament.maxParticipants}` },
                        { icon: <Clock size={13} style={{ color: "#22d47e" }} />, label: "Closes In", value: tournament.startsIn },
                    ].map((item) => (
                        <div key={item.label}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                                {item.icon}
                                <span style={{ fontSize: "0.68rem", color: "rgba(240,241,245,0.3)", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    {item.label}
                                </span>
                            </div>
                            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "#f0f1f5" }}>
                                {item.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Progress bar */}
                <div
                    style={{
                        height: 2,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 999,
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            height: "100%",
                            width: `${fillPct}%`,
                            background: "linear-gradient(90deg, #22d47e, #4ade80)",
                            borderRadius: 999,
                            transition: "width 0.4s ease",
                        }}
                    />
                </div>
            </Link>
        </MotionDiv>
    );
}

function LiveTournamentsComponent() {
    const { state, refresh } = useTournaments();
    const showViewAll = state.status === "success" || state.status === "empty";

    return (
        <section
            style={{
                background: "transparent",
                padding: "96px 0",
                position: "relative",
            }}
        >
            <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
                <MotionDiv
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    style={{ marginBottom: 48 }}
                >
                    <p
                        style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "0.7rem",
                            color: "rgba(240,241,245,0.3)",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            marginBottom: 14,
                        }}
                    >
                        Live now
                    </p>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                        <h2
                            style={{
                                fontFamily: "'Syne', sans-serif",
                                fontWeight: 700,
                                fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                                color: "#f0f1f5",
                                letterSpacing: "-0.03em",
                                lineHeight: 1.1,
                            }}
                        >
                            Live Tournaments
                        </h2>
                        {showViewAll && (
                            <Link
                                href={ROUTES.explore}
                                style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "0.75rem",
                                    color: "rgba(34,212,126,0.6)",
                                    textDecoration: "none",
                                    letterSpacing: "0.04em",
                                    transition: "color 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "#22d47e"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(34,212,126,0.6)"; }}
                            >
                                View All →
                            </Link>
                        )}
                    </div>
                </MotionDiv>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: 16,
                    }}
                    className="grid-cols-1 md:grid-cols-2"
                >
                    {state.status === "loading" && [0, 1, 2, 3].map((i) => <TournamentCardSkeleton key={i} />)}
                    {state.status === "error" && <ErrorState onRetry={refresh} />}
                    {state.status === "empty" && <EmptyState />}
                    {state.status === "success" &&
                        state.data.map((tournament, index) => (
                            <TournamentCard key={tournament.id} tournament={tournament} index={index} />
                        ))}
                </div>
            </div>
        </section>
    );
}

export const LiveTournaments = memo(() => <LiveTournamentsComponent />);
LiveTournaments.displayName = "LiveTournaments";