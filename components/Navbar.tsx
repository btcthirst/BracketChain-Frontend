"use client";

import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";
import { ROUTES } from "@/constants/links";

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
                    {/* Geometric B mark */}
                    <img src="/logo.svg" alt="BracketChain" width={32} height={32} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span
                            style={{
                                fontFamily: "'Syne', sans-serif",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                color: "#f0f1f5",
                                letterSpacing: "-0.01em",
                                lineHeight: 1.15,
                            }}
                        >
                            BracketChain
                        </span>
                        <span
                            style={{
                                fontSize: "0.55rem",
                                color: "rgba(240,241,245,0.38)",
                                letterSpacing: "0.1em",
                                lineHeight: 1.2,
                            }}
                        >
                            tournament protocol
                        </span>
                    </div>
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
                        { label: "About", href: ROUTES.about },
                    ].map((item) => (
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
                    ))}
                </div>

                <ConnectButton />
            </div>
        </nav>
    );
}