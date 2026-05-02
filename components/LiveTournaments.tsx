"use client";

import Link from "next/link";
import { Users, Clock, Trophy, RefreshCw, PlusCircle } from "lucide-react";
import { MotionDiv } from "@/components/ui/motion-wraper";
import { ROUTES } from "@/constants/links";
import { useTournaments } from "@/hooks/useTournaments";
import type { Tournament } from "@/hooks/useTournaments";
import { memo } from "react";

// ── Skeleton card ─────────────────────────────────────────────────────────────

function TournamentCardSkeleton() {
    return (
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 flex flex-col gap-4">
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                    <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse" />
            </div>
            <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map(i => (
                    <div key={i} className="flex flex-col gap-1.5">
                        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                        <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
                    </div>
                ))}
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full animate-pulse" />
        </div>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div className="col-span-2 flex flex-col items-center gap-5 py-16 text-center">
            {/* Simple bracket illustration */}
            <svg viewBox="0 0 120 80" className="w-32 h-20 text-gray-300" fill="none">
                <rect x="4" y="16" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                <rect x="4" y="52" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                <rect x="52" y="34" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                <rect x="92" y="34" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                <path d="M28 22 H40 V58 H28" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M40 40 H52" stroke="currentColor" strokeWidth="2" />
                <path d="M76 40 H92" stroke="currentColor" strokeWidth="2" />
            </svg>

            <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold text-gray-700">No tournaments yet</p>
                <p className="text-sm text-gray-500 max-w-xs">
                    Be the first to create one and start competing on-chain.
                </p>
            </div>

            <Link
                href={ROUTES.create}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
                <PlusCircle className="w-4 h-4" />
                Create the first tournament
            </Link>
        </div>
    );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="col-span-2 flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold text-gray-700">Unable to load tournaments</p>
                <p className="text-sm text-gray-500">Something went wrong. Please try again.</p>
            </div>
            <button
                onClick={onRetry}
                className="flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 px-5 py-2.5 rounded-lg font-medium transition-colors"
            >
                <RefreshCw className="w-4 h-4" />
                Try again
            </button>
        </div>
    );
}

// ── Tournament card ───────────────────────────────────────────────────────────

function TournamentCard({ tournament, index }: { tournament: Tournament; index: number }) {
    return (
        <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
        >
            <Link
                href={ROUTES.tournament(tournament.id)}
                className="block bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow cursor-pointer border border-gray-200"
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{tournament.name}</h3>
                        <p className="text-gray-600">{tournament.game}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                        {tournament.format}
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <div>
                            <div className="text-sm text-gray-500">Prize Pool</div>
                            <div className="font-bold text-gray-900">${tournament.prizePool.toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        <div>
                            <div className="text-sm text-gray-500">Players</div>
                            <div className="font-bold text-gray-900">{tournament.participants}/{tournament.maxParticipants}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-green-500" />
                        <div>
                            <div className="text-sm text-gray-500">Starts In</div>
                            <div className="font-bold text-gray-900">{tournament.startsIn}</div>
                        </div>
                    </div>
                </div>

                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${(tournament.participants / tournament.maxParticipants) * 100}%` }}
                    />
                </div>
            </Link>
        </MotionDiv>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

function LiveTournamentsComponent() {
    const { state, refresh } = useTournaments();
    console.log("state: ", state);
    return (
        <section className="bg-gray-50 py-20">
            <div className="container mx-auto px-6">
                <MotionDiv
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Live Tournaments</h2>
                    <p className="text-xl text-gray-600">Join the action now</p>
                </MotionDiv>

                <div className="grid md:grid-cols-2 gap-6 mb-8">

                    {/* Loading */}
                    {state.status === "loading" && (
                        [0, 1, 2, 3].map(i => <TournamentCardSkeleton key={i} />)
                    )}

                    {/* Error */}
                    {state.status === "error" && (
                        <ErrorState onRetry={refresh} />
                    )}

                    {/* Empty */}
                    {state.status === "empty" && (
                        <EmptyState />
                    )}

                    {/* Success */}
                    {state.status === "success" && (
                        state.data.map((tournament, index) => (
                            <TournamentCard
                                key={tournament.id}
                                tournament={tournament}
                                index={index}
                            />
                        ))
                    )}

                </div>

                {/* "View All" only when we have data */}
                {state.status === "success" && (
                    <div className="text-center">
                        <Link
                            href={ROUTES.explore}
                            className="text-blue-600 hover:text-blue-700 font-semibold text-lg hover:underline"
                        >
                            View All Tournaments →
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
}

export const LiveTournaments = memo(() => <LiveTournamentsComponent />);

LiveTournaments.displayName = "LiveTournaments";