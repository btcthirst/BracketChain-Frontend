"use client";

import Link from "next/link";
import { Gamepad2, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/links";
import type { Tournament } from "@/lib/tournament";
import { motion } from "framer-motion";

interface Props {
    tournament: Tournament;
}

export function TournamentCard({ tournament }: Props) {
    const isLive = tournament.status === "Active" || tournament.status === "PendingBracketInit";
    const isCancelled = tournament.status === "Cancelled";
    const isCompleted = tournament.status === "Completed";
    const isRegistrationClosed =
        tournament.status === "Registration" &&
        Number.isFinite(new Date(tournament.registrationDeadline).getTime()) &&
        new Date(tournament.registrationDeadline).getTime() <= Date.now();

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="h-full"
        >
            <Link href={ROUTES.tournament(tournament.id)} className="h-full block">
                <Card className="h-full border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all group flex flex-col p-5 gap-6 bg-white">
                    {/* Top Row: Format & Status | Game */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 font-bold">{tournament.format}</Badge>
                            {isLive ? (
                                <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50 gap-1.5 px-2">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> LIVE
                                </Badge>
                            ) : isCancelled ? (
                                <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                                    Cancelled
                                </Badge>
                            ) : isCompleted ? (
                                <Badge variant="outline" className="border-gray-200 text-gray-700 bg-gray-50">
                                    Completed
                                </Badge>
                            ) : isRegistrationClosed ? (
                                <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                                    Closed
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50">
                                    Upcoming
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                            <Gamepad2 className="w-3.5 h-3.5" />
                            {tournament.game || "On-chain"}
                        </div>
                    </div>

                    {/* Middle Row: Title & Prize Pool */}
                    <div className="flex flex-col gap-1.5">
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {tournament.name}
                        </h3>
                        <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-black text-green-600">${tournament.prizePool.toLocaleString()}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prize Pool</div>
                        </div>
                    </div>

                    {/* Bottom Rows: Players, Starts in, Entry Fee */}
                    <div className="mt-auto flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            {/* Players */}
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-1.5">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white" />
                                    <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white" />
                                    <div className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white" />
                                </div>
                                <div className="text-sm font-medium text-gray-500">
                                    <span className="text-gray-900 font-bold">{tournament.participants}</span>/{tournament.maxParticipants}
                                </div>
                            </div>
                            
                            {/* Starts In */}
                            <div className="text-sm font-medium text-gray-500">
                                {isLive
                                    ? <span className="text-red-500 font-bold">• In Progress</span>
                                    : isCancelled
                                        ? <span className="text-red-600 font-semibold">Cancelled</span>
                                        : isCompleted
                                            ? "Ended"
                                            : isRegistrationClosed
                                                ? <span className="text-amber-600 font-semibold">Awaiting start</span>
                                                : `Starts in ${tournament.startsIn}`}
                            </div>
                        </div>

                        <div className="h-px bg-gray-100" />

                        <div className="flex items-center justify-between">
                            {tournament.entryFee === 0 ? (
                                <div className="flex items-center gap-1.5 text-sm font-bold text-green-600">
                                    <Gift className="w-4 h-4" /> Free Entry
                                </div>
                            ) : (
                                <div className="text-sm font-medium text-gray-500">Entry Fee</div>
                            )}
                            
                            <div className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                {tournament.entryFee === 0 ? "$0" : `$${tournament.entryFee}`}
                            </div>
                        </div>
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
}