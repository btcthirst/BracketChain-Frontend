"use client";

import { useState } from "react";
import { ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { joinTournament, startTournament, mapError } from "@bracketchain/sdk";
import { toast } from "sonner";
import type { TournamentView, Player } from "@/types/tournament";
import { SOLANA } from "@/constants/links";
import { useBracketChainClient } from "@/lib/sdk";
import { useConfetti } from "@/hooks/useConfetti";
import { useWalletBalance } from "@/hooks/useWalletBalance";

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
                    className="h-full bg-blue-500 rounded-full transition-all"
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

function EscrowPanel({ tournament }: { tournament: TournamentView }) {
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

                {/* Payout bar */}
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

            {/* Completed payouts with tx links */}
            {tournament.status === "completed" && (
                <div className="flex flex-col gap-1.5">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Payout Transactions</h4>
                    {tournament.payouts.map(entry => (
                        <div key={entry.place} className="flex items-center justify-between text-xs px-3 py-2 bg-green-50 rounded-lg">
                            <span className="text-gray-700">{entry.label} — {entry.recipient?.display ?? "—"}</span>
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
    );
}

// ── Organizer panel ───────────────────────────────────────────────────────────

function OrganizerPanel({ organizer }: { organizer: Player }) {
    return (
        <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-800">Organizer</h3>
            <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg">
                <span className="text-xs font-mono text-gray-700">{organizer.display}</span>
                <a
                    href={SOLANA.explorerAddr(organizer.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                </a>
            </div>
        </div>
    );
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionArea({
    tournament,
    currentAddress,
    isOrganizer,
}: {
    tournament: TournamentView;
    currentAddress: string | null;
    isOrganizer: boolean;
}) {
    const [joining, setJoining] = useState(false);
    const [starting, setStarting] = useState(false);
    const [joined, setJoined] = useState(false);

    const sdk = useBracketChainClient();
    const { fire } = useConfetti();
    const { usdc: walletUsdc, refresh: refreshBalance } = useWalletBalance();

    const isParticipant = tournament.participants.some(
        p => p.address === currentAddress
    );

    const hasEnough = walletUsdc !== null && walletUsdc >= tournament.entryFee;

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
            setJoined(true);
            fire();
            refreshBalance(); // Update local balance after spend
        } catch (err: unknown) {
            // Handle wallet rejection (not an error to show as "Failure")
            const error = err as Error;
            if (error.message?.toLowerCase().includes("rejected")) {
                toast.info("Request cancelled");
                return;
            }

            const sdkErr = mapError(err);

            // Special handling for insufficient balance on devnet
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
        } catch (err) {
            const sdkErr = mapError(err);
            toast.error(sdkErr.message);
            console.error("Start failed:", err);
        } finally {
            setStarting(false);
        }
    }

    if (tournament.status === "cancelled") return null;

    if (tournament.status === "completed") {
        return (
            <button
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => {
                    document.getElementById("payouts-section")?.scrollIntoView({ behavior: "smooth" });
                }}
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
                <button
                    onClick={handleStart}
                    disabled={starting || !canStart}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${isFull
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-purple-600 hover:bg-purple-700 text-white"
                        } disabled:bg-gray-100 disabled:text-gray-400`}
                >
                    {starting
                        ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Initializing...</>
                        : isFull ? "Start Tournament" : "Start Early (Lock Bracket)"
                    }
                </button>
            );
        }

        return (
            <button className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-colors">
                Report Result
            </button>
        );
    }

    if (tournament.status !== "registration") return null;

    if (isParticipant || joined) {
        return (
            <div className="flex flex-col gap-3">
                <button disabled className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 font-semibold text-sm cursor-default">
                    <CheckCircle2 className="w-4 h-4" />
                    Registered
                </button>
                {tournament.participants.length >= tournament.maxParticipants && (
                    <p className="text-[11px] text-center text-gray-500 italic">
                        Tournament is full! Waiting for organizer to start...
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {!hasEnough && currentAddress && !joining && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700">
                    <span className="font-bold">Low balance:</span> Your wallet has {walletUsdc?.toFixed(2) ?? "0"} USDC.
                </div>
            )}
            <button
                id="join-btn"
                onClick={handleJoin}
                disabled={joining || !hasEnough || tournament.participants.length >= tournament.maxParticipants}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-colors"
            >
                {joining
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Awaiting wallet…</>
                    : tournament.participants.length >= tournament.maxParticipants
                        ? "Tournament Full"
                        : !hasEnough && currentAddress
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
                <div key={i} className={`w-full bg-gray-100 rounded-xl animate-pulse`} style={{ height: h }} />
            ))}
        </div>
    );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export function TournamentSidebar({
    tournament,
    currentAddress,
}: {
    tournament: TournamentView;
    currentAddress: string | null;
}) {
    const isOrganizer = tournament.organizer.address === currentAddress;

    return (
        <aside className="flex flex-col gap-6 p-5 bg-white border border-gray-200 rounded-2xl h-fit">
            <ParticipantList
                participants={tournament.participants}
                currentAddress={currentAddress}
                maxParticipants={tournament.maxParticipants}
            />
            <div id="payouts-section">
                <EscrowPanel tournament={tournament} />
            </div>
            <OrganizerPanel organizer={tournament.organizer} />
            <ActionArea
                tournament={tournament}
                currentAddress={currentAddress}
                isOrganizer={isOrganizer}
            />
        </aside>
    );
}