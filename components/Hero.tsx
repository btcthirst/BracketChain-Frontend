"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MotionDiv, MotionPath } from "@/components/ui/motion-wraper";
import { ROUTES } from "@/constants/links";

export function Hero() {
    return (
        <section
            style={{
                background: "transparent",
                minHeight: "90vh",
                display: "flex",
                alignItems: "center",
                position: "relative",
            }}
        >

            {/* ── Content ── */}
            <div
                style={{
                    maxWidth: 1120,
                    margin: "0 auto",
                    padding: "80px 24px",
                    width: "100%",
                    position: "relative",
                    zIndex: 1,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 64,
                    alignItems: "center",
                }}
                className="lg:grid-cols-2 grid-cols-1"
            >
                {/* Left: copy */}
                <MotionDiv
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Label chip */}
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "5px 12px",
                            background: "rgba(34,212,126,0.08)",
                            border: "1px solid rgba(34,212,126,0.20)",
                            borderRadius: 999,
                            marginBottom: 28,
                        }}
                    >
                        <span
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#22d47e",
                                boxShadow: "0 0 8px #22d47e",
                                display: "inline-block",
                                flexShrink: 0,
                            }}
                        />
                        <span
                            style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "0.72rem",
                                color: "rgba(240,241,245,0.6)",
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                            }}
                        >
                            Solana tournament infrastructure
                        </span>
                    </div>

                    <h1
                        style={{
                            fontFamily: "'Syne', sans-serif",
                            fontSize: "clamp(2.4rem, 5.5vw, 4.5rem)",
                            fontWeight: 800,
                            lineHeight: 1.05,
                            letterSpacing: "-0.03em",
                            color: "#f0f1f5",
                            marginBottom: 24,
                        }}
                    >
                        Prize pools that{" "}
                        <em style={{ fontStyle: "italic", color: "#22d47e" }}>
                            pay themselves.
                        </em>
                    </h1>

                    <p
                        style={{
                            fontSize: "1.05rem",
                            color: "rgba(240,241,245,0.50)",
                            lineHeight: 1.7,
                            marginBottom: 40,
                            maxWidth: 440,
                        }}
                    >
                        Trustless brackets, escrowed prize pools and near-instant USDC
                        settlement. Designed for organizers, players, and game developers.
                    </p>

                    {/* CTA row */}
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 48 }}>
                        <Link
                            href={ROUTES.create}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "12px 24px",
                                background: "#22d47e",
                                color: "#06070b",
                                borderRadius: 8,
                                fontWeight: 700,
                                fontSize: "0.9rem",
                                textDecoration: "none",
                                fontFamily: "'Inter', sans-serif",
                                transition: "background 0.15s, box-shadow 0.15s",
                                boxShadow: "0 0 24px rgba(34,212,126,0.35)",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#16c062";
                                e.currentTarget.style.boxShadow = "0 0 36px rgba(34,212,126,0.55)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#22d47e";
                                e.currentTarget.style.boxShadow = "0 0 24px rgba(34,212,126,0.35)";
                            }}
                        >
                            Create Tournament
                            <ArrowRight size={15} />
                        </Link>
                        <Link
                            href={ROUTES.explore}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "12px 24px",
                                background: "transparent",
                                color: "rgba(240,241,245,0.65)",
                                border: "1px solid rgba(255,255,255,0.11)",
                                borderRadius: 8,
                                fontWeight: 500,
                                fontSize: "0.9rem",
                                textDecoration: "none",
                                fontFamily: "'Inter', sans-serif",
                                transition: "border-color 0.15s, color 0.15s, background 0.15s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
                                e.currentTarget.style.color = "#f0f1f5";
                                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.11)";
                                e.currentTarget.style.color = "rgba(240,241,245,0.65)";
                                e.currentTarget.style.background = "transparent";
                            }}
                        >
                            Explore Tournaments
                        </Link>
                    </div>

                    {/* Stats strip */}
                    <div
                        style={{
                            display: "flex",
                            gap: 28,
                            borderTop: "1px solid rgba(255,255,255,0.07)",
                            paddingTop: 24,
                        }}
                    >
                        {[
                            { label: "Protocol fee", value: "3.5%" },
                            { label: "Custody", value: "$0" },
                            { label: "Network", value: "Solana" },
                        ].map((s) => (
                            <div key={s.label}>
                                <div
                                    style={{
                                        fontFamily: "'DM Mono', monospace",
                                        fontSize: "0.68rem",
                                        color: "rgba(240,241,245,0.28)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.08em",
                                        marginBottom: 4,
                                    }}
                                >
                                    {s.label}
                                </div>
                                <div
                                    style={{
                                        fontFamily: "'Syne', sans-serif",
                                        fontWeight: 700,
                                        fontSize: "1rem",
                                        color: "#f0f1f5",
                                    }}
                                >
                                    {s.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </MotionDiv>

                {/* Right: bracket visualization */}
                <MotionDiv
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="hidden lg:block"
                >
                    <BracketVisualization />
                </MotionDiv>
            </div>
        </section>
    );
}

function BracketVisualization() {
    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                aspectRatio: "4/3",
                borderRadius: 16,
                border: "1px solid rgba(34,212,126,0.12)",
                background: "rgba(6,7,11,0.72)",
                backdropFilter: "blur(12px)",
                overflow: "hidden",
                boxShadow:
                    "0 0 60px rgba(34,212,126,0.06), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
        >
            {/* Card inner glow top-left */}
            <div
                style={{
                    position: "absolute",
                    top: -40,
                    left: -40,
                    width: 200,
                    height: 200,
                    background:
                        "radial-gradient(circle, rgba(34,212,126,0.10) 0%, transparent 70%)",
                    pointerEvents: "none",
                }}
            />

            {/* Card inner glow bottom-right */}
            <div
                style={{
                    position: "absolute",
                    bottom: -30,
                    right: -30,
                    width: 160,
                    height: 160,
                    background:
                        "radial-gradient(circle, rgba(34,212,126,0.06) 0%, transparent 70%)",
                    pointerEvents: "none",
                }}
            />

            {/* Status badge */}
            <div
                style={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    background: "rgba(34,212,126,0.08)",
                    border: "1px solid rgba(34,212,126,0.18)",
                    borderRadius: 999,
                    zIndex: 2,
                }}
            >
                <span
                    style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "#22d47e",
                        boxShadow: "0 0 6px #22d47e",
                        flexShrink: 0,
                    }}
                />
                <span
                    style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.65rem",
                        color: "#22d47e",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                    }}
                >
                    Championship stage · Live
                </span>
            </div>

            <svg
                viewBox="0 0 520 340"
                style={{ width: "100%", height: "100%", paddingTop: 16 }}
            >
                <defs>
                    <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22d47e" />
                        <stop offset="100%" stopColor="#4ade80" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Round 1 */}
                {[
                    { x: 20, y: 60, label: "Player_0x1", winner: true },
                    { x: 20, y: 100, label: "User_99", winner: false },
                    { x: 20, y: 180, label: "Anon_ETH", winner: false },
                    { x: 20, y: 220, label: "Wallet_A", winner: true },
                ].map((p, i) => (
                    <g key={i}>
                        <rect
                            x={p.x} y={p.y} width={130} height={30} rx={5}
                            fill={p.winner ? "rgba(34,212,126,0.12)" : "rgba(13,15,24,0.95)"}
                            stroke={p.winner ? "rgba(34,212,126,0.38)" : "rgba(255,255,255,0.07)"}
                            strokeWidth={1}
                        />
                        <text
                            x={p.x + 10} y={p.y + 19}
                            fontSize={10} fontFamily="DM Mono, monospace"
                            fill={p.winner ? "#86efac" : "rgba(240,241,245,0.28)"}
                        >
                            {p.label}
                        </text>
                        {p.winner && (
                            <text x={p.x + 118} y={p.y + 19} fontSize={9} fill="#22d47e" fontFamily="DM Mono, monospace">
                                2
                            </text>
                        )}
                    </g>
                ))}

                {/* Connectors R1 → R2 */}
                <path d="M150 75  H185 V130 H220" stroke="rgba(34,212,126,0.16)" strokeWidth={1} fill="none" />
                <path d="M150 115 H185 V130 H220" stroke="rgba(34,212,126,0.16)" strokeWidth={1} fill="none" />
                <path d="M150 195 H185 V230 H220" stroke="rgba(34,212,126,0.16)" strokeWidth={1} fill="none" />
                <path d="M150 235 H185 V230 H220" stroke="rgba(34,212,126,0.16)" strokeWidth={1} fill="none" />

                {/* Round 2 */}
                {[
                    { x: 220, y: 115, label: "Player_0x1" },
                    { x: 220, y: 215, label: "Wallet_A" },
                ].map((p, i) => (
                    <g key={i}>
                        <rect
                            x={p.x} y={p.y} width={130} height={30} rx={5}
                            fill="rgba(34,212,126,0.09)"
                            stroke="rgba(34,212,126,0.28)"
                            strokeWidth={1}
                        />
                        <text x={p.x + 10} y={p.y + 19} fontSize={10} fill="#86efac" fontFamily="DM Mono, monospace">
                            {p.label}
                        </text>
                    </g>
                ))}

                {/* Connectors R2 → Final */}
                <path d="M350 130 H385 V182 H420" stroke="url(#greenGrad)" strokeWidth={1.5} fill="none" />
                <path d="M350 230 H385 V182 H420" stroke="url(#greenGrad)" strokeWidth={1.5} fill="none" />

                {/* Final slot */}
                <rect
                    x={420} y={162} width={80} height={40} rx={6}
                    fill="rgba(34,212,126,0.14)"
                    stroke="#22d47e"
                    strokeWidth={1.5}
                    filter="url(#glow)"
                />
                <text x={460} y={179} fontSize={8} fill="rgba(240,241,245,0.38)" textAnchor="middle" fontFamily="DM Mono, monospace">
                    FINAL
                </text>
                <text x={460} y={194} fontSize={8} fill="#22d47e" textAnchor="middle" fontFamily="DM Mono, monospace">
                    TBD
                </text>

                {/* Animated payout arrow */}
                <MotionPath
                    d="M460 202 L460 262"
                    stroke="url(#greenGrad)"
                    strokeWidth={2}
                    fill="none"
                    markerEnd="url(#arrow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.2, delay: 0.8, repeat: Infinity, repeatDelay: 2.5 }}
                />
                <defs>
                    <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                        <polygon points="0 0, 8 4, 0 8" fill="#22d47e" />
                    </marker>
                </defs>

                <text
                    x={460} y={280} fontSize={9}
                    fill="rgba(34,212,126,0.65)"
                    textAnchor="middle"
                    fontFamily="DM Mono, monospace"
                >
                    USDC · near-instant
                </text>
            </svg>
        </div>
    );
}