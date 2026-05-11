"use client";

import Link from "next/link";
import { NAV_LINKS } from "@/constants/links";
import { ConnectButton } from "@/components/ConnectButton";
import Image from "next/image";

export function Navbar() {
    return (
        <nav
            style={{
                position: "sticky",
                top: 0,
                zIndex: 50,
                padding: "12px 24px",
            }}
        >
            <div
                style={{
                    maxWidth: 1120,
                    margin: "0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    height: 58,
                    background: "rgba(10,11,16,0.96)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 14,
                    padding: "0 20px",
                }}
            >
                {/* Logo */}
                <Link
                    href={NAV_LINKS[0].href}
                    style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}
                >
                    <Image src="/logo.svg" alt="BracketChain" width={28} height={28} />
                    <span
                        style={{
                            fontFamily: "'Syne', sans-serif",
                            fontWeight: 700,
                            fontSize: "1rem",
                            color: "#f0f1f5",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        BracketChain
                    </span>
                </Link>

                {/* Nav links — hidden on mobile */}
                <div className="hidden md:flex" style={{ alignItems: "center", gap: 2 }}>
                    {NAV_LINKS.filter((l) => l.label !== "HOME").map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            style={{
                                padding: "6px 14px",
                                color: "rgba(240,241,245,0.5)",
                                fontSize: "0.7rem",
                                fontFamily: "'DM Mono', monospace",
                                fontWeight: 500,
                                letterSpacing: "0.09em",
                                textDecoration: "none",
                                borderRadius: 20,
                                background: "transparent",
                                transition: "color 0.15s, background 0.15s, font-weight 0.15s",
                                whiteSpace: "nowrap",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#f0f1f5";
                                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                                e.currentTarget.style.fontWeight = "700";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = "rgba(240,241,245,0.5)";
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.fontWeight = "500";
                            }}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* CTA */}
                <ConnectButton />
            </div>
        </nav>
    );
}
