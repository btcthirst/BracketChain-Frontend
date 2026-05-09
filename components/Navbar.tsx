"use client";

import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";
import { ROUTES, EXTERNAL_LINKS } from "@/constants/links";

export function Navbar() {
    return (
        <nav
            style={{
                position: "sticky",
                top: 0,
                zIndex: 50,
                background: "rgba(6,7,11,0.85)",
                backdropFilter: "blur(16px)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
        >
            <div
                style={{
                    maxWidth: 1120,
                    margin: "0 auto",
                    padding: "0 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    height: 60,
                }}
            >
                {/* Logo */}
                <Link
                    href={ROUTES.home}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        textDecoration: "none",
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

                {/* Nav links */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                    }}
                    className="hidden md:flex"
                >
                    {[
                        { label: "Explore", href: ROUTES.explore },
                        { label: "Docs", href: EXTERNAL_LINKS.docs, external: true },
                        { label: "About", href: ROUTES.about },
                    ].map((item) => (
                        item.external ? (
                            <a
                                key={item.label}
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    padding: "6px 14px",
                                    color: "rgba(240,241,245,0.6)",
                                    fontSize: "0.85rem",
                                    fontWeight: 500,
                                    textDecoration: "none",
                                    borderRadius: 6,
                                    transition: "color 0.15s, background 0.15s",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "#f0f1f5";
                                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "rgba(240,241,245,0.6)";
                                    e.currentTarget.style.background = "transparent";
                                }}
                            >
                                {item.label}
                            </a>
                        ) : (
                            <Link
                                key={item.label}
                                href={item.href}
                                style={{
                                    padding: "6px 14px",
                                    color: "rgba(240,241,245,0.6)",
                                    fontSize: "0.85rem",
                                    fontWeight: 500,
                                    textDecoration: "none",
                                    borderRadius: 6,
                                    transition: "color 0.15s, background 0.15s",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "#f0f1f5";
                                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "rgba(240,241,245,0.6)";
                                    e.currentTarget.style.background = "transparent";
                                }}
                            >
                                {item.label}
                            </Link>
                        )
                    ))}
                </div>

                <ConnectButton />
            </div>
        </nav>
    );
}