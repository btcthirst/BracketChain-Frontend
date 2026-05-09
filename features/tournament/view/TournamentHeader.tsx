import { ExternalLink, Share2, Check } from "lucide-react";
import { useState } from "react";
import type { TournamentView, TournamentStatus, TournamentFormat } from "@/types/tournament";
import { CountdownTimer } from "@/components/ui/CountdownTimer";

const STATUS_STYLES: Record<TournamentStatus, React.CSSProperties> = {
    registration: { background: "rgba(34,212,126,0.08)", color: "#22d47e",             border: "1px solid rgba(34,212,126,0.22)" },
    in_progress:  { background: "rgba(34,212,126,0.08)", color: "#22d47e",             border: "1px solid rgba(34,212,126,0.22)" },
    completed:    { background: "rgba(255,255,255,0.05)", color: "rgba(240,241,245,0.45)", border: "1px solid rgba(255,255,255,0.1)" },
    cancelled:    { background: "rgba(240,78,102,0.08)", color: "#f04e66",             border: "1px solid rgba(240,78,102,0.22)" },
};

const STATUS_LABELS: Record<TournamentStatus, string> = {
    registration: "Registration Open",
    in_progress:  "In Progress",
    completed:    "Completed",
    cancelled:    "Cancelled",
};

const FORMAT_LABEL: Record<TournamentFormat, string> = {
    SE: "Single Elim", DE: "Double Elim", Swiss: "Swiss", RR: "Round Robin",
};

const badgeBase: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.65rem",
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 999,
    letterSpacing: "0.04em",
};

export function TournamentHeader({ tournament }: { tournament: TournamentView }) {
    const [copied, setCopied] = useState(false);

    function handleShare() {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const twitterText = encodeURIComponent(
        `Join "${tournament.name}" — ${tournament.prizePool.toLocaleString()} ${tournament.token} prize pool on @BracketChain!\n${window.location.href}`
    );

    return (
        <div style={{ background: "rgba(6,7,11,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* Top row: badges + share */}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                            <span style={{ ...badgeBase, ...STATUS_STYLES[tournament.status] }}>
                                {STATUS_LABELS[tournament.status]}
                            </span>
                            <span style={{ ...badgeBase, background: "rgba(255,255,255,0.05)", color: "rgba(240,241,245,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                {FORMAT_LABEL[tournament.format]}
                            </span>
                            {tournament.game && (
                                <span style={{ ...badgeBase, background: "rgba(255,255,255,0.05)", color: "rgba(240,241,245,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                    {tournament.game}
                                </span>
                            )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <button
                                onClick={handleShare}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "7px 14px",
                                    borderRadius: 8,
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    background: "transparent",
                                    color: "rgba(240,241,245,0.55)",
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 600,
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                    transition: "border-color 0.15s, color 0.15s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; e.currentTarget.style.color = "#f0f1f5"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(240,241,245,0.55)"; }}
                            >
                                {copied
                                    ? <><Check style={{ width: 14, height: 14, color: "#22d47e" }} /> Copied!</>
                                    : <><Share2 style={{ width: 14, height: 14 }} /> Share</>
                                }
                            </button>
                            <a
                                href={`https://twitter.com/intent/tweet?text=${twitterText}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "7px 14px",
                                    borderRadius: 8,
                                    background: "#1d9bf0",
                                    color: "#fff",
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 600,
                                    fontSize: "0.8rem",
                                    textDecoration: "none",
                                    transition: "background 0.15s",
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#1a8cd8")}
                                onMouseLeave={e => (e.currentTarget.style.background = "#1d9bf0")}
                            >
                                <ExternalLink style={{ width: 14, height: 14 }} />
                                Tweet
                            </a>
                        </div>
                    </div>

                    {/* Title */}
                    <h1
                        style={{
                            fontFamily: "'Syne', sans-serif",
                            fontWeight: 800,
                            fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                            color: "#f0f1f5",
                            letterSpacing: "-0.03em",
                            lineHeight: 1.1,
                        }}
                    >
                        {tournament.name}
                    </h1>

                    {/* Info strip */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                            gap: 24,
                            marginTop: 8,
                            paddingTop: 20,
                            borderTop: "1px solid rgba(255,255,255,0.07)",
                        }}
                    >
                        <InfoMetric label="Prize Pool"    value={`$${tournament.prizePool.toLocaleString()} ${tournament.token}`} accent />
                        <InfoMetric label="Participants"  value={`${tournament.participants.length}/${tournament.maxParticipants}`} />
                        <InfoMetric label="Entry Fee"     value={tournament.entryFee === 0 ? "Free" : `$${tournament.entryFee} ${tournament.token}`} />
                        <InfoMetric
                            label={tournament.status === "registration" ? "Registration closes in" : "Started"}
                            value={tournament.status === "registration"
                                ? <CountdownTimer deadline={tournament.registrationDeadline} />
                                : new Date(tournament.startTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoMetric({ label, value, accent }: { label: string; value: string | React.ReactNode; accent?: boolean }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
                style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.62rem",
                    fontWeight: 500,
                    color: "rgba(240,241,245,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                }}
            >
                {label}
            </span>
            <span
                style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: "1.15rem",
                    color: accent ? "#22d47e" : "#f0f1f5",
                    letterSpacing: "-0.02em",
                }}
            >
                {value}
            </span>
        </div>
    );
}
