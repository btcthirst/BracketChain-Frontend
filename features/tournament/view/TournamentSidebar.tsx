"use client";

import { useState } from "react";
import { ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import type { TournamentView, Player } from "@/types/tournament";
import { SOLANA } from "@/constants/links";

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
                {Array.from({ length: maxParticipants - participants.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="px-3 py-2 rounded-lg bg-gray-50 border border-dashed border-gray-200">
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
    const [joined, setJoined] = useState(false);

    const isParticipant = tournament.participants.some(
        p => p.address === currentAddress
    );

    async function handleJoin() {
        setJoining(true);
        // TODO: real Solana tx — call program joinTournament instruction
        await new Promise(r => setTimeout(r, 1800));
        setJoining(false);
        setJoined(true);
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
        return (
            <button className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-colors">
                Report Result
            </button>
        );
    }

    if (tournament.status !== "registration") return null;

    if (isParticipant || joined) {
        return (
            <button disabled className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 font-semibold text-sm cursor-default">
                <CheckCircle2 className="w-4 h-4" />
                Registered
            </button>
        );
    }

    return (
        <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm transition-colors"
        >
            {joining
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Awaiting wallet…</>
                : <>Join Tournament {tournament.entryFee > 0 ? `— ${tournament.entryFee} ${tournament.token}` : "— Free"}</>
            }
        </button>
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