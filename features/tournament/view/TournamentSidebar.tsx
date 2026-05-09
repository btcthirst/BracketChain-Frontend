"use client";

import { useRef, useState } from "react";
import { ExternalLink, CheckCircle2, Loader2, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { joinTournament, startTournament, mapError } from "@bracketchain/sdk";
import { toast } from "sonner";
import type { TournamentView, Player } from "@/types/tournament";
import { SOLANA } from "@/constants/links";
import { useBracketChainClient } from "@/lib/sdk";
import { useConfetti } from "@/hooks/useConfetti";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useDeadlineReached } from "@/hooks/useDeadlineReached";

// ── Participant list ───────────────────────────────────────────────────────────

function ParticipantList({
    participants,
    currentAddress,
    maxParticipants,
}: {
    participants: Player[];
    currentAddress: string | null;
    maxParticipants: number;
}) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Participants</h3>
                <span className="text-xs text-gray-500">{participants.length}/{maxParticipants}</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${(participants.length / maxParticipants) * 100}%` }}
                />
            </div>

            <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1 mt-1">
                {participants.map(p => (
                    <div
                        key={p.address}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${p.address === currentAddress
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-gray-50"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-gray-700">{p.display}</span>
                            {p.isOrganizer && (
                                <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                    ORG
                                </span>
                            )}
                            {p.address === currentAddress && (
                                <span className="text-[10px] font-semibold text-blue-600">You</span>
                            )}
                        </div>
                        <a
                            href={SOLANA.explorerAddr(p.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-300 hover:text-gray-500 transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: Math.max(0, maxParticipants - participants.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-dashed border-gray-200 opacity-50">
                        <span className="text-xs text-gray-300 italic">Open slot</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Escrow / payout panel ─────────────────────────────────────────────────────

function EscrowPanel({
    tournament,
    payoutsExpanded,
    setPayoutsExpanded,
    payoutsRef,
}: {
    tournament: TournamentView;
    payoutsExpanded: boolean;
    setPayoutsExpanded: (v: boolean) => void;
    payoutsRef: React.RefObject<HTMLDivElement | null>;
}) {
    const total = tournament.prizePool;
    const afterFee = total * 0.965;

    return (
        <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-800">Prize Pool</h3>

            <div className="bg-[#0a1929] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold text-white">
                        {total.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-400">{tournament.token}</span>
                </div>

                {/* Payout distribution bar */}
                <div className="flex flex-col gap-1.5">
                    {tournament.payouts.map(entry => (
                        <div key={entry.place} className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>{entry.label} — {entry.pct}%</span>
                                <span className="text-white font-medium">
                                    {entry.amount.toLocaleString()} {tournament.token}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${entry.pct}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-[10px] text-gray-500 border-t border-white/10 pt-2">
                    Net to winners after 3.5% protocol fee: {afterFee.toLocaleString()} {tournament.token}
                </p>
            </div>

            {/* Completed payouts — inline expander */}
            {tournament.status === "completed" && (
                <div ref={payoutsRef} className="flex flex-col gap-1.5">
                    <button
                        onClick={() => setPayoutsExpanded(!payoutsExpanded)}
                        className="flex items-center justify-between w-full text-xs font-semibold text-gray-600 uppercase tracking-wide hover:text-gray-800 transition-colors"
                    >
                        <span>Payout Transactions</span>
                        {payoutsExpanded
                            ? <ChevronUp className="w-3.5 h-3.5" />
                            : <ChevronDown className="w-3.5 h-3.5" />
                        }
                    </button>

                    {payoutsExpanded && (
                        <div className="flex flex-col gap-1">
                            {tournament.payouts.map(entry => (
                                <div key={entry.place} className="flex items-center justify-between text-xs px-3 py-2 bg-green-50 rounded-lg">
                                    <span className="text-gray-700">
                                        {entry.label} — {entry.recipient?.display ?? "—"}
                                    </span>
                                    {entry.txSignature ? (
                                        <a
                                            href={SOLANA.explorerTx(entry.txSignature)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-green-600 hover:underline font-mono"
                                        >
                                            {entry.txSignature.slice(0, 8)}…
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    ) : (
                                        <span className="text-gray-400">Pending</span>
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
        <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-800">Organizer</h3>
            <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-700">{organizer.display}</span>
                    <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">ORG</span>
                </div>
                <a
                    href={SOLANA.explorerAddr(organizer.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="View on Solana Explorer"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
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
    // Local optimistic state — prevents double-join while refetch is in flight
    const [optimisticJoined, setOptimisticJoined] = useState(false);

    const sdk = useBracketChainClient();
    const { fire } = useConfetti();
    const { usdc: walletUsdc, refresh: refreshBalance } = useWalletBalance();

    const isParticipant = optimisticJoined || tournament.participants.some(
        p => p.address === currentAddress
    );

    const hasEnough = walletUsdc !== null && walletUsdc >= tournament.entryFee;

    // Client-side deadline guard. The program rejects join with RegistrationClosed
    // once the deadline passes, even while UI status is still "registration"
    // (status only flips on the next on-chain interaction). Without this gate the
    // user sees an active Join button → signs → eats a confusing rejection.
    const registrationClosed = useDeadlineReached(tournament.registrationDeadline);

    async function handleJoin() {
        if (!sdk) {
            toast.error("Connect your wallet to join");
            return;
        }

        setJoining(true);
        try {
            await joinTournament(sdk, {
                tournamentPda: new PublicKey(tournament.id),
            });

            toast.success("Joined tournament successfully!");
            setOptimisticJoined(true);
            fire();
            refreshBalance();
            // Re-fetch tournament data so participant list updates
            onJoinSuccess();
        } catch (err: unknown) {
            const error = err as Error;
            if (error.message?.toLowerCase().includes("rejected")) {
                toast.info("Request cancelled");
                return;
            }

            const sdkErr = mapError(err);

            if (sdkErr.message.includes("balance") || sdkErr.constructor.name === "InsufficientBalanceError") {
                toast.error(
                    <div className="flex flex-col gap-1">
                        <span className="font-semibold">Insufficient Balance</span>
                        <span className="text-xs opacity-90">{sdkErr.message}</span>
                        <a
                            href="https://spl-token-faucet.com"
                            target="_blank"
                            className="mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-200 hover:text-white underline"
                        >
                            Get Devnet USDC →
                        </a>
                    </div>
                );
            } else {
                toast.error(sdkErr.message);
            }
            // RegistrationClosed / TournamentFull / status-mismatch errors mean
            // our cached view is stale. Refresh so the disabled-state branches
            // below pick up the current on-chain truth on next render.
            if (/registration|closed|full|status/i.test(sdkErr.message)) {
                onJoinSuccess();
            }
            console.error("Join failed:", err);
        } finally {
            setJoining(false);
        }
    }

    async function handleStart() {
        if (!sdk) return;
        setStarting(true);
        try {
            await startTournament(sdk, {
                tournamentPda: new PublicKey(tournament.id),
            });
            toast.success("Tournament started! Bracket is being initialized.");
            onJoinSuccess(); // reuse to refresh data
        } catch (err) {
            const sdkErr = mapError(err);
            toast.error(sdkErr.message);
            console.error("Start failed:", err);
        } finally {
            setStarting(false);
        }
    }

    if (tournament.status === "cancelled") return null;

    // ── Completed: View Payouts button expands inline list + scrolls to it ──
    if (tournament.status === "completed") {
        return (
            <button
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={onViewPayouts}
            >
                View Payouts →
            </button>
        );
    }

    // ── Organizer controls ───────────────────────────────────────────────────
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

        // PendingBracketInit — start_tournament is chunked; when init didn't
        // finish in one tx (large brackets, RPC hiccups), tournament is stuck
        // here. SDK is idempotent — calling startTournament again resumes from
        // matchesInitialized. Without this branch the organizer is stranded:
        // Start button is gone (status no longer Registration), report flow
        // fails on-chain (TournamentNotActive).
        if (!tournament.bracketReady) {
            const pct = tournament.totalMatches > 0
                ? Math.round((tournament.matchesInitialized / tournament.totalMatches) * 100)
                : 0;
            return (
                <div className="flex flex-col gap-3">
                    <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                        <p className="font-semibold mb-1">Bracket initializing</p>
                        <p className="mb-2">
                            {tournament.matchesInitialized} / {tournament.totalMatches} matches written on-chain.
                            Large brackets need multiple transactions.
                        </p>
                        <div className="w-full h-1.5 bg-amber-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleStart}
                        disabled={starting}
                        className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-colors disabled:bg-gray-100 disabled:text-gray-400"
                    >
                        {starting
                            ? <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Continuing…
                            </span>
                            : "Continue Bracket Init"
                        }
                    </button>
                    <CancelDangerZone onCancel={onCancel} />
                </div>
            );
        }

        // Bracket fully initialized — reporting happens by clicking matches
        // in the bracket. Sidebar shows an info hint instead of a button to
        // keep one canonical entry point.
        return (
            <div className="px-4 py-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-800 leading-relaxed">
                <p className="font-semibold mb-1">Reporting results</p>
                <p>Click an <span className="font-semibold">active match</span> (purple, pulsing) in the bracket to pick its winner. Final match auto-distributes the prize pool.</p>
            </div>
        );
    }

    if (tournament.status !== "registration") return null;

    // ── Already registered ───────────────────────────────────────────────────
    if (isParticipant) {
        return (
            <div className="flex flex-col gap-3">
                <button disabled className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 font-semibold text-sm cursor-default">
                    <CheckCircle2 className="w-4 h-4" />
                    Registered
                </button>
                {tournament.participants.length >= tournament.maxParticipants && (
                    <p className="text-[11px] text-center text-gray-500 italic">
                        Tournament is full! Waiting for organizer to start…
                    </p>
                )}
            </div>
        );
    }

    // ── Registration closed (deadline passed) ────────────────────────────────
    if (registrationClosed) {
        return (
            <div className="flex flex-col gap-2">
                <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold text-sm cursor-not-allowed"
                >
                    <Clock className="w-4 h-4" />
                    Registration Closed
                </button>
                <p className="text-[11px] text-center text-gray-500 italic">
                    The deadline has passed. Waiting for organizer to start the bracket.
                </p>
            </div>
        );
    }

    // ── Join button ──────────────────────────────────────────────────────────
    const isFull = tournament.participants.length >= tournament.maxParticipants;

    return (
        <div className="flex flex-col gap-3">
            {!hasEnough && currentAddress && !joining && tournament.entryFee > 0 && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700">
                    <span className="font-bold">Low balance:</span> Your wallet has {walletUsdc?.toFixed(2) ?? "0"} USDC.
                </div>
            )}
            <button
                id="join-btn"
                onClick={handleJoin}
                disabled={joining || (!hasEnough && tournament.entryFee > 0) || isFull}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-colors"
            >
                {joining
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Awaiting wallet…</>
                    : isFull
                        ? "Tournament Full"
                        : (!hasEnough && currentAddress && tournament.entryFee > 0)
                            ? "Insufficient Balance"
                            : <>Join Tournament {tournament.entryFee > 0 ? `— ${tournament.entryFee} ${tournament.token}` : "— Free"}</>
                }
            </button>
        </div>
    );
}

// ── Sidebar skeleton ──────────────────────────────────────────────────────────

export function SidebarSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-5">
            {[80, 120, 60].map((h, i) => (
                <div key={i} className="w-full bg-gray-100 rounded-xl animate-pulse" style={{ height: h }} />
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
    // Lifted from EscrowPanel so the "View Payouts" CTA in ActionArea can both
    // expand the list and scroll to it without DOM-id juggling.
    const [payoutsExpanded, setPayoutsExpanded] = useState(false);
    const payoutsRef = useRef<HTMLDivElement | null>(null);

    function handleViewPayouts() {
        setPayoutsExpanded(true);
        // rAF — scroll after React commits the expanded list, otherwise the
        // target's height changes mid-scroll and we land short.
        requestAnimationFrame(() => {
            payoutsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    }

    return (
        <aside className="flex flex-col gap-6 p-5 bg-white border border-gray-200 rounded-2xl h-fit">
            <ParticipantList
                participants={tournament.participants}
                currentAddress={currentAddress}
                maxParticipants={tournament.maxParticipants}
            />
            <EscrowPanel
                tournament={tournament}
                payoutsExpanded={payoutsExpanded}
                setPayoutsExpanded={setPayoutsExpanded}
                payoutsRef={payoutsRef}
            />
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