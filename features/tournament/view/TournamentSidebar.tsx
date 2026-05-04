"use client";

import { useRef, useState } from "react";
import { ExternalLink, CheckCircle2, Loader2, ChevronDown, ChevronUp, Info } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { joinTournament, startTournament, mapError } from "@bracketchain/sdk";
import { toast } from "sonner";
import Link from "next/link";
import type { TournamentView, Player } from "@/types/tournament";
import { SOLANA, ROUTES } from "@/constants/links";
import { useBracketChainClient } from "@/lib/sdk";
import { useConfetti } from "@/hooks/useConfetti";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { JoinConfirmationModal } from "./JoinConfirmationModal";

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
                            <Link href={ROUTES.player(p.address)} className="hover:underline">
                                <span className="font-mono text-gray-700">{p.display}</span>
                            </Link>
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

// ── Action area ───────────────────────────────────────────────────────────────

function ActionArea({
    tournament,
    currentAddress,
    isOrganizer,
    onJoinSuccess,
    onViewPayouts,
}: {
    tournament: TournamentView;
    currentAddress: string | null;
    isOrganizer: boolean;
    onJoinSuccess: () => void;
    onViewPayouts: () => void;
}) {
    const [joining, setJoining] = useState(false);
    const [starting, setStarting] = useState(false);
    // Local optimistic state — prevents double-join while refetch is in flight
    const [optimisticJoined, setOptimisticJoined] = useState(false);

    const sdk = useBracketChainClient();
    const { setVisible } = useWalletModal();
    const { fire } = useConfetti();
    const { usdc: walletUsdc, refresh: refreshBalance } = useWalletBalance();

    const isParticipant = optimisticJoined || tournament.participants.some(
        p => p.address === currentAddress
    );

    const hasEnough = walletUsdc !== null && walletUsdc >= tournament.entryFee;
    const isRegistrationClosed = new Date(tournament.registrationDeadline) < new Date();
    const isFull = tournament.participants.length >= tournament.maxParticipants;

    const [showConfirm, setShowConfirm] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    async function handleJoin() {
        if (!sdk) {
            setVisible(true); // Open wallet modal
            return;
        }

        if (isFull) return;
        if (isRegistrationClosed) return;

        setShowConfirm(true);
    }

    async function onConfirmJoin() {
        if (!sdk) return;
        setJoining(true);
        
        // Timeout warning after 30s
        timeoutRef.current = setTimeout(() => {
            toast.warning("Transaction is taking longer than expected. Check your wallet.");
        }, 30000);

        try {
            await joinTournament(sdk, {
                tournamentPda: new PublicKey(tournament.id),
            });

            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            
            toast.success("Joined tournament successfully!");
            setOptimisticJoined(true);
            fire();
            refreshBalance();
            setShowConfirm(false);
            onJoinSuccess();
        } catch (err: unknown) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            const error = err as Error;
            if (error.message?.toLowerCase().includes("rejected")) {
                toast.info("Request cancelled");
                return;
            }

            const sdkErr = mapError(err);
            toast.error(sdkErr.message);
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
            onJoinSuccess();
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
            const isFullOrg = tournament.participants.length >= tournament.maxParticipants;
            const canStart = tournament.participants.length >= 2;

            return (
                <button
                    onClick={handleStart}
                    disabled={starting || !canStart}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${isFullOrg
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                        } disabled:bg-gray-100 disabled:text-gray-400`}
                >
                    {starting
                        ? <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Initializing...
                        </span>
                        : isFullOrg ? "Start Tournament" : "Start Early (Lock Bracket)"
                    }
                </button>
            );
        }

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
                </div>
            );
        }

        return (
            <div className="px-4 py-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-800 leading-relaxed">
                <p className="font-semibold mb-1">Reporting results</p>
                <p>Click an <span className="font-semibold">active match</span> (purple, pulsing) in the bracket to pick its winner.</p>
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
                    Registered ✓
                </button>
            </div>
        );
    }

    // ── Join button ──────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-3">
            {!hasEnough && currentAddress && !joining && tournament.entryFee > 0 && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    <span>Low balance: Required {tournament.entryFee} USDC.</span>
                </div>
            )}
            <button
                id="join-btn"
                onClick={handleJoin}
                disabled={joining || isFull || isRegistrationClosed}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-100"
            >
                {isFull
                    ? "Tournament Full"
                    : isRegistrationClosed
                        ? "Registration Closed"
                        : (!hasEnough && currentAddress && tournament.entryFee > 0)
                            ? "Insufficient Balance"
                            : `Join Tournament — ${tournament.entryFee === 0 ? "Free" : `${tournament.entryFee} USDC`}`
                }
            </button>

            <JoinConfirmationModal 
                tournament={tournament}
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={onConfirmJoin}
                isJoining={joining}
            />
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
}: {
    tournament: TournamentView;
    currentAddress: string | null;
    onJoinSuccess: () => void;
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
            />
        </aside>
    );
}