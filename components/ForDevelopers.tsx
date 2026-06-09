"use client";

import { Copy, Check, Shield, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MotionDiv } from "./ui/motion-wraper";
import { EXTERNAL_LINKS } from "@/constants/links";

const CODE_SNIPPET = `import { BracketChain } from '@bracketchain/sdk';

const bc = new BracketChain({ network: 'mainnet' });

const tournament = await bc.create({
  name: 'My Tournament',
  prizePool: 1000,      // USDC
  maxPlayers: 16,
  format: 'single-elim',
});

// Prize pool escrowed on-chain
await tournament.start();
// Winners paid automatically`;

const FEATURES = [
    "Trustless escrow — funds locked on-chain",
    "Auto settlement in USDC via Solana",
    "Webhook events for bracket updates",
    "TypeScript-first SDK",
];

export function ForDevelopers() {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText("npm install @bracketchain/sdk");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section style={{ background: "transparent", padding: "96px 0" }}>
            <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 64,
                        alignItems: "center",
                    }}
                    className="grid-cols-1 lg:grid-cols-2"
                >
                    {/* Left: copy */}
                    <MotionDiv
                        initial={{ opacity: 0, x: -24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 12px",
                                background: "rgba(34,212,126,0.08)",
                                border: "1px solid rgba(34,212,126,0.18)",
                                borderRadius: 999,
                                marginBottom: 20,
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "0.68rem",
                                    color: "rgba(240,241,245,0.5)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                }}
                            >
                                SDK & API
                            </span>
                        </div>

                        <h2
                            style={{
                                fontFamily: "'Syne', sans-serif",
                                fontWeight: 700,
                                fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                                color: "#f0f1f5",
                                letterSpacing: "-0.03em",
                                lineHeight: 1.1,
                                marginBottom: 16,
                            }}
                        >
                            For Developers
                        </h2>
                        <p
                            style={{
                                fontSize: "0.95rem",
                                color: "rgba(240,241,245,0.42)",
                                lineHeight: 1.7,
                                marginBottom: 32,
                                maxWidth: 420,
                            }}
                        >
                            Integrate tournament infrastructure into your game with just a few lines of code.
                        </p>

                        {/* npm install chip */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                background: "rgba(13,15,24,0.9)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: 8,
                                padding: "10px 14px",
                                marginBottom: 28,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span
                                    style={{
                                        fontFamily: "'DM Mono', monospace",
                                        fontSize: "0.7rem",
                                        color: "rgba(240,241,245,0.25)",
                                        letterSpacing: "0.04em",
                                    }}
                                >
                                    $
                                </span>
                                <code
                                    style={{
                                        fontFamily: "'DM Mono', monospace",
                                        fontSize: "0.82rem",
                                        color: "#86efac",
                                    }}
                                >
                                    npm install @bracketchain/sdk
                                </code>
                            </div>
                            <button
                                onClick={handleCopy}
                                aria-label="Copy"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 28,
                                    height: 28,
                                    background: "transparent",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    transition: "border-color 0.15s, background 0.15s",
                                    flexShrink: 0,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = "rgba(34,212,126,0.3)";
                                    e.currentTarget.style.background = "rgba(34,212,126,0.06)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                                    e.currentTarget.style.background = "transparent";
                                }}
                            >
                                {copied
                                    ? <Check size={13} style={{ color: "#22d47e" }} />
                                    : <Copy size={13} style={{ color: "rgba(240,241,245,0.4)" }} />
                                }
                            </button>
                        </div>

                        {/* Feature list */}
                        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
                            {FEATURES.map((f) => (
                                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span
                                        style={{
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: "#22d47e",
                                            flexShrink: 0,
                                        }}
                                    />
                                    <span style={{ fontSize: "0.875rem", color: "rgba(240,241,245,0.5)" }}>{f}</span>
                                </li>
                            ))}
                        </ul>

                        {/* CTA row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                            <Button variant="primary" asChild>
                                <a href={EXTERNAL_LINKS.docs} target="_blank" rel="noopener noreferrer">
                                    Read the Docs
                                    <ArrowUpRight className="size-[14px]" />
                                </a>
                            </Button>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <Shield size={14} style={{ color: "#22d47e" }} />
                                <span style={{ fontSize: "0.83rem", color: "rgba(240,241,245,0.35)" }}>
                                    Audited by Certik
                                </span>
                            </div>
                        </div>
                    </MotionDiv>

                    {/* Right: code panel */}
                    <MotionDiv
                        initial={{ opacity: 0, x: 24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        <div
                            style={{
                                background: "rgba(6,7,11,0.80)",
                                border: "1px solid rgba(34,212,126,0.10)",
                                borderRadius: 12,
                                overflow: "hidden",
                                boxShadow: "0 0 48px rgba(34,212,126,0.04), inset 0 1px 0 rgba(255,255,255,0.04)",
                            }}
                        >
                            {/* Fake window bar */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "12px 16px",
                                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                                }}
                            >
                                {["#f04e66", "#f5a623", "#22d47e"].map((c) => (
                                    <span
                                        key={c}
                                        style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.6 }}
                                    />
                                ))}
                                <span
                                    style={{
                                        marginLeft: 8,
                                        fontFamily: "'DM Mono', monospace",
                                        fontSize: "0.68rem",
                                        color: "rgba(240,241,245,0.2)",
                                        letterSpacing: "0.04em",
                                    }}
                                >
                                    tournament.ts
                                </span>
                            </div>
                            <pre
                                style={{
                                    padding: "24px",
                                    margin: 0,
                                    overflowX: "auto",
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "0.8rem",
                                    lineHeight: 1.75,
                                    color: "rgba(240,241,245,0.55)",
                                }}
                            >
                                <code>{CODE_SNIPPET}</code>
                            </pre>
                        </div>
                    </MotionDiv>
                </div>
            </div>
        </section>
    );
}
