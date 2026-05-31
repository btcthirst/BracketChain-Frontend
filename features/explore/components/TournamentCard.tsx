"use client";

import { memo } from "react";
import Link from "next/link";
import { Gamepad2, Gift, Users, Clock, Trophy } from "lucide-react";
import { ROUTES } from "@/constants/links";
import type { Tournament } from "@/lib/tournament";
import { motion } from "motion/react";
import { useDeadlineReached } from "@/hooks/useDeadlineReached";

interface Props {
    tournament: Tournament;
}

// Five-state badge variants. Distinguishing Cancelled from Completed and
// surfacing "registration deadline passed but on-chain status hasn't caught
// up yet" matter at the card level — those tournaments cannot accept new
// joins, and showing them as "Upcoming" misleads the user.
type StatusVariant = "live" | "cancelled" | "completed" | "closed" | "upcoming";

const STATUS_BADGE: Record<StatusVariant, { label: string; style: React.CSSProperties; pulse?: boolean }> = {
    live: {
        label: "LIVE",
        style: { background: "rgba(240,78,102,0.08)", border: "1px solid rgba(240,78,102,0.20)", color: "#f04e66" },
        pulse: true,
    },
    cancelled: {
        label: "Cancelled",
        style: { background: "rgba(240,78,102,0.06)", border: "1px solid rgba(240,78,102,0.18)", color: "rgba(240,78,102,0.85)" },
    },
    completed: {
        label: "Ended",
        style: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(240,241,245,0.45)" },
    },
    closed: {
        label: "Closed",
        style: { background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.22)", color: "#f5a623" },
    },
    upcoming: {
        label: "Upcoming",
        style: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(240,241,245,0.35)" },
    },
};

function TournamentCardImpl({ tournament }: Props) {
    const isLive = tournament.status === "Active" || tournament.status === "PendingBracketInit";
    const isCancelled = tournament.status === "Cancelled";
    const isCompleted = tournament.status === "Completed";
    // useDeadlineReached ticks internally and stays pure-during-render —
    // direct Date.now() in render is flagged by react-hooks/purity. Hook
    // handles invalid-date edge case (returns false on NaN deadline).
    const deadlineReached = useDeadlineReached(tournament.registrationDeadline);
    const isRegistrationClosed = tournament.status === "Registration" && deadlineReached;

    const variant: StatusVariant = isLive
        ? "live"
        : isCancelled
            ? "cancelled"
            : isCompleted
                ? "completed"
                : isRegistrationClosed
                    ? "closed"
                    : "upcoming";

    const badge = STATUS_BADGE[variant];
    const fillPct = Math.round((tournament.participants / tournament.maxParticipants) * 100);

    const timeText = isLive
        ? "In Progress"
        : isCancelled
            ? "Cancelled"
            : isCompleted
                ? "Ended"
                : isRegistrationClosed
                    ? "Awaiting start"
                    : tournament.startsIn;

    const timeColor = isLive
        ? "#f04e66"
        : isCancelled
            ? "rgba(240,78,102,0.85)"
            : isRegistrationClosed
                ? "#f5a623"
                : "rgba(240,241,245,0.35)";

    return (
        <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
            style={{ height: "100%" }}
        >
            <Link
                href={ROUTES.tournament(tournament.id)}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    background: "rgba(13,15,24,0.85)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 12,
                    padding: 20,
                    textDecoration: "none",
                    gap: 16,
                    transition: "border-color 0.18s, box-shadow 0.18s",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(34,212,126,0.22)";
                    e.currentTarget.style.boxShadow = "0 0 28px rgba(34,212,126,0.06)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.boxShadow = "none";
                }}
            >
                {/* Top: format + status | game */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {/* Format badge */}
                        <span
                            style={{
                                padding: "2px 8px",
                                background: "rgba(34,212,126,0.08)",
                                border: "1px solid rgba(34,212,126,0.18)",
                                borderRadius: 999,
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "0.65rem",
                                color: "#22d47e",
                                letterSpacing: "0.04em",
                            }}
                        >
                            {tournament.format}
                        </span>

                        {/* Status badge — 5 variants */}
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "0.65rem",
                                letterSpacing: "0.04em",
                                ...badge.style,
                            }}
                        >
                            {badge.pulse && (
                                <span
                                    style={{
                                        width: 5,
                                        height: 5,
                                        borderRadius: "50%",
                                        background: "currentColor",
                                        animation: "pulse 1.2s ease-in-out infinite",
                                    }}
                                />
                            )}
                            {badge.label}
                        </span>
                    </div>

                    {/* Game */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.7rem",
                            color: "rgba(240,241,245,0.3)",
                            fontFamily: "'DM Mono', monospace",
                        }}
                    >
                        <Gamepad2 size={11} />
                        {tournament.game || "On-chain"}
                    </div>
                </div>

                {/* Title + prize */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <h3
                        style={{
                            fontFamily: "'Syne', sans-serif",
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            color: "#f0f1f5",
                            letterSpacing: "-0.01em",
                            lineHeight: 1.25,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical",
                        }}
                    >
                        {tournament.name}
                    </h3>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <Trophy size={12} style={{ color: "#f5a623", flexShrink: 0, marginBottom: -1 }} />
                        <span
                            style={{
                                fontFamily: "'Syne', sans-serif",
                                fontWeight: 800,
                                fontSize: "1.4rem",
                                color: "#22d47e",
                                letterSpacing: "-0.02em",
                                lineHeight: 1,
                            }}
                        >
                            ${tournament.prizePool.toLocaleString()}
                        </span>
                        <span
                            style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "0.62rem",
                                color: "rgba(240,241,245,0.25)",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                            }}
                        >
                            Prize Pool
                        </span>
                    </div>
                </div>

                {/* Stats row */}
                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        {/* Players */}
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Users size={12} style={{ color: "rgba(240,241,245,0.3)" }} />
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem" }}>
                                <span style={{ color: "#f0f1f5", fontWeight: 600 }}>{tournament.participants}</span>
                                <span style={{ color: "rgba(240,241,245,0.3)" }}>/{tournament.maxParticipants}</span>
                            </span>
                        </div>

                        {/* Time */}
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Clock size={12} style={{ color: "rgba(240,241,245,0.3)" }} />
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: timeColor }}>
                                {timeText}
                            </span>
                        </div>
                    </div>

                    {/* Fill bar */}
                    <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
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

                    {/* Entry fee */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        {tournament.entryFee === 0 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", fontWeight: 600, color: "#22d47e" }}>
                                <Gift size={13} />
                                Free Entry
                            </div>
                        ) : (
                            <span style={{ fontSize: "0.75rem", color: "rgba(240,241,245,0.3)", fontFamily: "'DM Mono', monospace" }}>Entry Fee</span>
                        )}
                        <span
                            style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                color: tournament.entryFee === 0 ? "rgba(34,212,126,0.6)" : "#f0f1f5",
                                background: "rgba(255,255,255,0.05)",
                                padding: "2px 8px",
                                borderRadius: 5,
                            }}
                        >
                            {tournament.entryFee === 0 ? "$0" : `$${tournament.entryFee}`}
                        </span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

// Memoized: the explore grid re-renders on every filter/scroll state change in
// ExplorePage, but a card only needs to re-render when its own tournament prop
// changes. Props are a stable `tournament` object reference per id.
export const TournamentCard = memo(TournamentCardImpl);
