import Link from "next/link";
import { NAV_LINKS, EXTERNAL_LINKS } from "@/constants/links";

const FOOTER_NAV = NAV_LINKS.filter((l) =>
    ["PROTOCOL", "LIVE DEMO", "MARKET"].includes(l.label)
);

const RESOURCE_LINKS = [
    { label: "WHITEPAPER", href: EXTERNAL_LINKS.docs, external: true },
    { label: "GITHUB", href: EXTERNAL_LINKS.github, external: true },
    { label: "CONTACT", href: EXTERNAL_LINKS.twitter, external: true },
];

const linkStyle: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.7rem",
    textDecoration: "none",
    letterSpacing: "0.06em",
};

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
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 48,
                    alignItems: "start",
                }}
            >
                {/* Brand */}
                <div>
                    <Link href={NAV_LINKS[0].href} style={{ textDecoration: "none" }}>
                        <span
                            style={{
                                fontFamily: "'Syne', sans-serif",
                                fontWeight: 700,
                                fontSize: "1.05rem",
                                color: "#f0f1f5",
                                letterSpacing: "-0.01em",
                                display: "block",
                                marginBottom: 12,
                            }}
                        >
                            BracketChain
                        </span>
                    </Link>
                    <p
                        style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "0.7rem",
                            color: "rgba(240,241,245,0.3)",
                            lineHeight: 1.7,
                            letterSpacing: "0.02em",
                        }}
                    >
                        © {new Date().getFullYear()} BracketChain Protocol.<br />
                        Living tournament infrastructure.
                    </p>
                </div>

                {/* Nav links */}
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                    {FOOTER_NAV.map((item) => (
                        <li key={item.label}>
                            <Link
                                href={item.href}
                                className="footer-link"
                                style={linkStyle}
                            >
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>

                {/* Resource links */}
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                    {RESOURCE_LINKS.map((item) => (
                        <li key={item.label}>
                            <a
                                href={item.href}
                                target={item.external ? "_blank" : undefined}
                                rel={item.external ? "noopener noreferrer" : undefined}
                                className="footer-link"
                                style={linkStyle}
                            >
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </footer>
    );
}
