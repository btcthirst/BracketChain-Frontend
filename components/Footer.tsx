"use client";

import Link from "next/link";
import { X, MessageCircle, FileText } from "lucide-react";
import GitHubIcon from "@mui/icons-material/GitHub";
import { ROUTES, EXTERNAL_LINKS } from "@/constants/links";

export function Footer() {
    return (
        <footer
            style={{
                background: "transparent",
                borderTop: "1px solid rgba(255,255,255,0.07)",
                paddingTop: 56,
                paddingBottom: 40,
            }}
        >
            <div
                style={{
                    maxWidth: 1120,
                    margin: "0 auto",
                    padding: "0 24px",
                }}
            >
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 48,
                        marginBottom: 48,
                    }}
                    className="grid-cols-1 md:grid-cols-2"
                >
                    {/* Brand */}
                    <div>
                        <Link
                            href={ROUTES.home}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 10,
                                textDecoration: "none",
                                marginBottom: 16,
                            }}
                        >
                            <div
                                style={{
                                    width: 28,
                                    height: 28,
                                    background: "linear-gradient(135deg, #22d47e 0%, #4ade80 100%)",
                                    borderRadius: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <rect x="0" y="3" width="5" height="3" rx="1" fill="white" />
                                    <rect x="0" y="8" width="5" height="3" rx="1" fill="white" />
                                    <rect x="5" y="5" width="4" height="4" rx="1" fill="white" opacity="0.7" />
                                    <rect x="9" y="5" width="5" height="4" rx="1" fill="white" opacity="0.5" />
                                </svg>
                            </div>
                            <span
                                style={{
                                    fontFamily: "'Syne', sans-serif",
                                    fontWeight: 700,
                                    fontSize: "0.95rem",
                                    color: "#f0f1f5",
                                    letterSpacing: "-0.01em",
                                }}
                            >
                                BracketChain
                            </span>
                        </Link>
                        <p
                            style={{
                                color: "rgba(240,241,245,0.35)",
                                fontSize: "0.85rem",
                                lineHeight: 1.6,
                                maxWidth: 280,
                                marginBottom: 20,
                            }}
                        >
                            Living tournament infrastructure powered by Solana.
                        </p>
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                background: "rgba(34,212,126,0.07)",
                                border: "1px solid rgba(34,212,126,0.15)",
                                borderRadius: 999,
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 397.7 311.7" fill="currentColor" style={{ color: "#22d47e", flexShrink: 0 }}>
                                <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
                                <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
                                <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
                            </svg>
                            <span
                                style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "0.7rem",
                                    color: "rgba(240,241,245,0.45)",
                                    letterSpacing: "0.04em",
                                }}
                            >
                                Built on Solana
                            </span>
                        </div>
                    </div>

                    {/* Links */}
                    <div
                        style={{
                            display: "flex",
                            gap: 56,
                        }}
                    >
                        <div>
                            <p
                                style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "0.65rem",
                                    color: "rgba(240,241,245,0.25)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em",
                                    marginBottom: 16,
                                }}
                            >
                                Resources
                            </p>
                            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                                {[
                                    { label: "Docs", href: EXTERNAL_LINKS.docs, icon: <FileText size={13} />, external: true },
                                    { label: "Blog", href: EXTERNAL_LINKS.blog, icon: <FileText size={13} />, external: false },
                                ].map((item) => (
                                    <li key={item.label}>
                                        <a
                                            href={item.href}
                                            target={item.external ? "_blank" : undefined}
                                            rel={item.external ? "noopener noreferrer" : undefined}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 7,
                                                color: "rgba(240,241,245,0.4)",
                                                fontSize: "0.85rem",
                                                textDecoration: "none",
                                                transition: "color 0.15s",
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.85)"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.4)"; }}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <p
                                style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "0.65rem",
                                    color: "rgba(240,241,245,0.25)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em",
                                    marginBottom: 16,
                                }}
                            >
                                Community
                            </p>
                            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                                {[
                                    { label: "GitHub", href: EXTERNAL_LINKS.github, icon: <GitHubIcon style={{ fontSize: 13 }} />, external: true },
                                    { label: "Twitter", href: EXTERNAL_LINKS.twitter, icon: <X size={13} />, external: true },
                                    { label: "Discord", href: EXTERNAL_LINKS.discord, icon: <MessageCircle size={13} />, external: true },
                                ].map((item) => (
                                    <li key={item.label}>
                                        <a
                                            href={item.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 7,
                                                color: "rgba(240,241,245,0.4)",
                                                fontSize: "0.85rem",
                                                textDecoration: "none",
                                                transition: "color 0.15s",
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.85)"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.4)"; }}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div
                    style={{
                        borderTop: "1px solid rgba(255,255,255,0.05)",
                        paddingTop: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                    }}
                >
                    <p
                        style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "0.7rem",
                            color: "rgba(240,241,245,0.2)",
                            letterSpacing: "0.03em",
                        }}
                    >
                        © {new Date().getFullYear()} BracketChain Protocol. Living tournament infrastructure.
                    </p>
                    <div style={{ display: "flex", gap: 20 }}>
                        {[
                            { label: "Protocol", href: ROUTES.home },
                            { label: "Live demo", href: ROUTES.create },
                            { label: "Market", href: ROUTES.explore },
                        ].map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "0.7rem",
                                    color: "rgba(240,241,245,0.25)",
                                    textDecoration: "none",
                                    transition: "color 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.6)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.25)"; }}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}