"use client";

import { useRef, useState } from "react";
import { ExternalLink, CheckCircle2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { joinTournament, startTournament, mapError } from "@bracketchain/sdk";
import { toast } from "sonner";
import type { TournamentView, Player } from "@/types/tournament";
import { SOLANA } from "@/constants/links";
import { useBracketChainClient } from "@/lib/sdk";
import { useConfetti } from "@/hooks/useConfetti";
import { useWalletBalance } from "@/hooks/useWalletBalance";

const sectionLabel: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.65rem",
    fontWeight: 500,
    color: "rgba(240,241,245,0.3)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
};

const darkRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
};

// ── Participant list ───────────────────────────────────────────────────────────

function ParticipantList({ participants, currentAddress, maxParticipants }: { participants: Player[]; currentAddress: string | null; maxParticipants: number }) {
    const fillPct = (participants.length / maxParticipants) * 100;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={sectionLabel}>Participants</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem" }}>
                    <span style={{ color: "#f0f1f5", fontWeight: 600 }}>{participants.length}</span>
                    <span style={{ color: "rgba(240,241,245,0.3)" }}>/{maxParticipants}</span>
                </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${fillPct}%`, background: "linear-gradient(90deg, #22d47e, #4ade80)", borderRadius: 999, transition: "width 0.4s ease" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 208, overflowY: "auto" }}>
                {participants.map(p => {
                    const isYou = p.address === currentAddress;
                    return (
                        <div
                            key={p.address}
                            style={{
                                ...darkRow,
                                background: isYou ? "rgba(34,212,126,0.06)" : "rgba(255,255,255,0.03)",
                                border: `1px solid ${isYou ? "rgba(34,212,126,0.18)" : "rgba(255,255,255,0.06)"}`,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: isYou ? "#22d47e" : "rgba(240,241,245,0.65)" }}>
                                    {p.display}
                                </span>
                                {p.isOrganizer && (
                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", fontWeight: 600, color: "#22d47e", background: "rgba(34,212,126,0.08)", border: "1px solid rgba(34,212,126,0.18)", padding: "1px 6px", borderRadius: 999 }}>
                                        ORG
                                    </span>
                                )}
                                {isYou && (
                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", fontWeight: 600, color: "rgba(34,212,126,0.6)" }}>You</span>
                                )}
                            </div>
                            <a
                                href={SOLANA.explorerAddr(p.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "rgba(240,241,245,0.2)", transition: "color 0.15s" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#22d47e")}
                                onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,241,245,0.2)")}
                            >
                                <ExternalLink style={{ width: 12, height: 12 }} />
                            </a>
                        </div>
                    );
                })}

                {/* Empty slots */}
                {Array.from({ length: Math.max(0, maxParticipants - participants.length) }).map((_, i) => (
                    <div key={`empty-${i}`} style={{ ...darkRow, border: "1px dashed rgba(255,255,255,0.07)", opacity: 0.5 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "rgba(240,241,245,0.2)", fontStyle: "italic" }}>Open slot</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Escrow / payout panel ─────────────────────────────────────────────────────

function EscrowPanel({ tournament, payoutsExpanded, setPayoutsExpanded, payoutsRef }: { tournament: TournamentView; payoutsExpanded: boolean; setPayoutsExpanded: (v: boolean) => void; payoutsRef: React.RefObject<HTMLDivElement | null> }) {
    const total = tournament.prizePool;
    const afterFee = total * 0.965;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={sectionLabel}>Prize Pool</span>

            <div style={{ background: "rgba(6,7,11,0.7)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.8rem", color: "#22d47e", letterSpacing: "-0.02em", lineHeight: 1 }}>
                        {total.toLocaleString()}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "rgba(240,241,245,0.35)" }}>{tournament.token}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tournament.payouts.map(entry => (
                        <div key={entry.place} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Mono', monospace", fontSize: "0.68rem" }}>
                                <span style={{ color: "rgba(240,241,245,0.35)" }}>{entry.label} — {entry.pct}%</span>
                                <span style={{ color: "#f0f1f5", fontWeight: 600 }}>{entry.amount.toLocaleString()} {tournament.token}</span>
                            </div>
                            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${entry.pct}%`, background: "linear-gradient(90deg, #22d47e, #4ade80)", borderRadius: 999 }} />
                            </div>
                        </div>
                    ))}
                </div>

                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "rgba(240,241,245,0.2)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                    Net to winners after 3.5% protocol fee: {afterFee.toLocaleString()} {tournament.token}
                </p>
            </div>

            {/* Completed payouts expander */}
            {tournament.status === "completed" && (
                <div ref={payoutsRef} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button
                        onClick={() => setPayoutsExpanded(!payoutsExpanded)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", fontWeight: 500, color: "rgba(240,241,245,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", transition: "color 0.15s", padding: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "rgba(240,241,245,0.6)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,241,245,0.3)")}
                    >
                        <span>Payout Transactions</span>
                        {payoutsExpanded ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
                    </button>

                    {payoutsExpanded && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {tournament.payouts.map(entry => (
                                <div key={entry.place} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(34,212,126,0.05)", border: "1px solid rgba(34,212,126,0.12)", borderRadius: 8 }}>
                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "rgba(240,241,245,0.55)" }}>
                                        {entry.label} — {entry.recipient?.display ?? "—"}
                                    </span>
                                    {entry.txSignature ? (
                                        <a href={SOLANA.explorerTx(entry.txSignature)} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "#22d47e", textDecoration: "none" }}>
                                            {entry.txSignature.slice(0, 8)}…
                                            <ExternalLink style={{ width: 10, height: 10 }} />
                                        </a>
                                    ) : (
                                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "rgba(240,241,245,0.25)" }}>Pending</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Organizer panel ───────────────────────────────────────────────────────────

function OrganizerPanel({ organizer }: { organizer: Player }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={sectionLabel}>Organizer</span>
            <div style={darkRow}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "rgba(240,241,245,0.65)" }}>{organizer.display}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", fontWeight: 600, color: "#22d47e", background: "rgba(34,212,126,0.08)", border: "1px solid rgba(34,212,126,0.18)", padding: "1px 6px", borderRadius: 999 }}>ORG</span>
                </div>
                <a href={SOLANA.explorerAddr(organizer.address)} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(240,241,245,0.2)", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#22d47e")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,241,245,0.2)")}
                    title="View on Solana Explorer"
                >
                    <ExternalLink style={{ width: 13, height: 13 }} />
                </a>
            </div>
        </div>
    );
}

// ── Cancel danger zone ────────────────────────────────────────────────────────
// Surfaced only in organizer branches where SDK `cancelTournament` accepts the
// status: Registration + PendingBracketInit. Active/Completed reject on-chain.

function CancelDangerZone({ onCancel }: { onCancel: () => void }) {
    return (
        <button
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 text-xs font-semibold transition-colors"
        >
            Cancel Tournament & Refund
        </button>
    );
}

// ── Action area ───────────────────────────────────────────────────────────────

function ActionArea({
    tournament,
    currentAddress,
    isOrganizer,
    onJoinSuccess,
    onViewPayouts,
    onCancel,
}: {
    tournament: TournamentView;
    currentAddress: string | null;
    isOrganizer: boolean;
    onJoinSuccess: () => void;
    onViewPayouts: () => void;
    onCancel: () => void;
}) {
    const [joining, setJoining] = useState(false);
    const [starting, setStarting] = useState(false);
    const [optimisticJoined, setOptimisticJoined] = useState(false);

    const sdk = useBracketChainClient();
    const { fire } = useConfetti();
    const { usdc: walletUsdc, refresh: refreshBalance } = useWalletBalance();

    const isParticipant = optimisticJoined || tournament.participants.some(p => p.address === currentAddress);
    const hasEnough = walletUsdc !== null && walletUsdc >= tournament.entryFee;

    async function handleJoin() {
        if (!sdk) { toast.error("Connect your wallet to join"); return; }
        setJoining(true);
        try {
            await joinTournament(sdk, { tournamentPda: new PublicKey(tournament.id) });
            toast.success("Joined tournament successfully!");
            setOptimisticJoined(true);
            fire();
            refreshBalance();
            onJoinSuccess();
        } catch (err: unknown) {
            const error = err as Error;
            if (error.message?.toLowerCase().includes("rejected")) { toast.info("Request cancelled"); return; }
            const sdkErr = mapError(err);
            if (sdkErr.message.includes("balance") || sdkErr.constructor.name === "InsufficientBalanceError") {
                toast.error(<div className="flex flex-col gap-1"><span className="font-semibold">Insufficient Balance</span><span className="text-xs opacity-90">{sdkErr.message}</span><a href="https://spl-token-faucet.com" target="_blank" className="mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-200 hover:text-white underline">Get Devnet USDC →</a></div>);
            } else { toast.error(sdkErr.message); }
            console.error("Join failed:", err);
        } finally { setJoining(false); }
    }

    async function handleStart() {
        if (!sdk) return;
        setStarting(true);
        try {
            await startTournament(sdk, { tournamentPda: new PublicKey(tournament.id) });
            toast.success("Tournament started! Bracket is being initialized.");
            onJoinSuccess();
        } catch (err) {
            const sdkErr = mapError(err);
            toast.error(sdkErr.message);
            console.error("Start failed:", err);
        } finally { setStarting(false); }
    }

    const btnGreen: React.CSSProperties = { width: "100%", padding: "12px 0", borderRadius: 10, background: "#22d47e", color: "#06070b", border: "none", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", boxShadow: "0 0 18px rgba(34,212,126,0.28)", transition: "background 0.15s, box-shadow 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
    const btnDisabled: React.CSSProperties = { ...btnGreen, background: "rgba(255,255,255,0.06)", color: "rgba(240,241,245,0.25)", boxShadow: "none", cursor: "not-allowed" };

    if (tournament.status === "cancelled") return null;

    if (tournament.status === "completed") {
        return (
            <button
                onClick={onViewPayouts}
                style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(240,241,245,0.5)", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(34,212,126,0.3)"; e.currentTarget.style.color = "#22d47e"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(240,241,245,0.5)"; }}
            >
                View Payouts →
            </button>
        );
    }

    if (isOrganizer) {
        if (tournament.status === "registration") {
            const isFull = tournament.participants.length >= tournament.maxParticipants;
            const canStart = tournament.participants.length >= 2;

            return (
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleStart}
                        disabled={starting || !canStart}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${isFull
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-purple-600 hover:bg-purple-700 text-white"
                            } disabled:bg-gray-100 disabled:text-gray-400`}
                    >
                        {starting
                            ? <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Initializing...
                            </span>
                            : isFull ? "Start Tournament" : "Start Early (Lock Bracket)"
                        }
                    </button>
                    <CancelDangerZone onCancel={onCancel} />
                </div>
            );
        }

        if (!tournament.bracketReady) {
            const pct = tournament.totalMatches > 0 ? Math.round((tournament.matchesInitialized / tournament.totalMatches) * 100) : 0;
            return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.2)", display: "flex", flexDirection: "column", gap: 8 }}>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: "#f5a623" }}>Bracket initializing</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "rgba(245,166,35,0.65)", lineHeight: 1.5 }}>
                            {tournament.matchesInitialized} / {tournament.totalMatches} matches written on-chain.
                        </p>
                        <div style={{ height: 3, background: "rgba(245,166,35,0.15)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "#f5a623", borderRadius: 999, transition: "width 0.5s ease" }} />
                        </div>
                    </div>
                    <button
                        onClick={handleStart}
                        disabled={starting}
                        style={{ width: "100%", padding: "12px 0", borderRadius: 10, background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.3)", color: "#f5a623", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: starting ? "not-allowed" : "pointer", transition: "background 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                        {starting ? <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Continuing…</> : "Continue Bracket Init"}
                    </button>
                    <CancelDangerZone onCancel={onCancel} />
                </div>
            );
        }

        return (
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(34,212,126,0.05)", border: "1px solid rgba(34,212,126,0.15)" }}>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: "#22d47e", marginBottom: 4 }}>Reporting results</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "rgba(34,212,126,0.6)", lineHeight: 1.5 }}>
                    Click an <span style={{ fontWeight: 700 }}>active match</span> (glowing, pulsing) in the bracket to pick its winner. Final match auto-distributes the prize pool.
                </p>
            </div>
        );
    }

    if (tournament.status !== "registration") return null;

    if (isParticipant) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button disabled style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", borderRadius: 10, background: "rgba(34,212,126,0.07)", border: "1px solid rgba(34,212,126,0.2)", color: "#22d47e", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: "default" }}>
                    <CheckCircle2 style={{ width: 16, height: 16 }} />
                    Registered
                </button>
                {tournament.participants.length >= tournament.maxParticipants && (
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", textAlign: "center", color: "rgba(240,241,245,0.3)", fontStyle: "italic" }}>
                        Tournament is full! Waiting for organizer to start…
                    </p>
                )}
            </div>
        );
    }

    const isFull = tournament.participants.length >= tournament.maxParticipants;
    const insufficient = !hasEnough && !!currentAddress && !joining && tournament.entryFee > 0;
    const joinDisabled = joining || insufficient || isFull;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {insufficient && (
                <div style={{ padding: "10px 12px", background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "rgba(245,166,35,0.7)" }}>
                    <span style={{ fontWeight: 700, color: "#f5a623" }}>Low balance:</span> Your wallet has {walletUsdc?.toFixed(2) ?? "0"} USDC.
                </div>
            )}
            <button
                id="join-btn"
                onClick={handleJoin}
                disabled={joinDisabled}
                style={joinDisabled ? btnDisabled : btnGreen}
                onMouseEnter={e => { if (!joinDisabled) { e.currentTarget.style.background = "#16c062"; e.currentTarget.style.boxShadow = "0 0 28px rgba(34,212,126,0.48)"; } }}
                onMouseLeave={e => { if (!joinDisabled) { e.currentTarget.style.background = "#22d47e"; e.currentTarget.style.boxShadow = "0 0 18px rgba(34,212,126,0.28)"; } }}
            >
                {joining
                    ? <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Awaiting wallet…</>
                    : isFull ? "Tournament Full"
                        : insufficient ? "Insufficient Balance"
                            : <>Join Tournament {tournament.entryFee > 0 ? `— ${tournament.entryFee} ${tournament.token}` : "— Free"}</>
                }
            </button>
        </div>
    );
}

// ── Sidebar skeleton ──────────────────────────────────────────────────────────

export function SidebarSkeleton() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 20 }}>
            {[80, 140, 60].map((h, i) => (
                <div key={i} style={{ width: "100%", background: "rgba(255,255,255,0.04)", borderRadius: 12, animation: "pulse 1.5s ease-in-out infinite", height: h }} />
            ))}
        </div>
    );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export function TournamentSidebar({
    tournament,
    currentAddress,
    onJoinSuccess,
    onCancel,
}: {
    tournament: TournamentView;
    currentAddress: string | null;
    onJoinSuccess: () => void;
    onCancel: () => void;
}) {
    const isOrganizer = tournament.organizer.address === currentAddress;
    const [payoutsExpanded, setPayoutsExpanded] = useState(false);
    const payoutsRef = useRef<HTMLDivElement | null>(null);

    function handleViewPayouts() {
        setPayoutsExpanded(true);
        requestAnimationFrame(() => {
            payoutsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    }

    return (
        <aside
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                padding: 20,
                background: "rgba(13,15,24,0.85)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                height: "fit-content",
            }}
        >
            <ParticipantList participants={tournament.participants} currentAddress={currentAddress} maxParticipants={tournament.maxParticipants} />
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
            <EscrowPanel tournament={tournament} payoutsExpanded={payoutsExpanded} setPayoutsExpanded={setPayoutsExpanded} payoutsRef={payoutsRef} />
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
            <OrganizerPanel organizer={tournament.organizer} />
            <ActionArea
                tournament={tournament}
                currentAddress={currentAddress}
                isOrganizer={isOrganizer}
                onJoinSuccess={onJoinSuccess}
                onViewPayouts={handleViewPayouts}
                onCancel={onCancel}
            />
        </aside>
    );
}
