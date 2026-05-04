"use client";

import Link from "next/link";
import { Users, Trophy, ArrowRight } from "lucide-react";
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
    const isCompleted = tournament.status === "Completed" || tournament.status === "Cancelled";
    
    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
        >
            <Link href={ROUTES.tournament(tournament.id)}>
                <Card className="h-full overflow-hidden border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all group flex flex-col">
                    {/* Header Image / Pattern */}
                    <div className="h-24 bg-[#0a1929] relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 to-transparent" />
                        <div className="absolute bottom-3 left-4">
                            <Badge variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-sm">
                                {tournament.game || "On-chain Game"}
                            </Badge>
                        </div>
                        {isLive && (
                            <div className="absolute top-3 right-4">
                                <div className="flex items-center gap-1.5 bg-red-500/90 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                                    Live
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-5 flex flex-col flex-1 gap-4">
                        <div className="flex flex-col gap-1">
                            <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {tournament.name}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    {tournament.format}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {isCompleted ? "Ended" : "Starts in 2h 45m"}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Prize Pool</span>
                            <div className="text-2xl font-black text-gray-900">
                                ${tournament.prizePool.toLocaleString()}
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    <Users className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase">Players</span>
                                </div>
                                <span className="text-sm font-bold text-gray-700">
                                    {tournament.participants}/{tournament.maxParticipants}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    <Trophy className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase">Entry</span>
                                </div>
                                <span className="text-sm font-bold text-gray-700">
                                    {tournament.entryFee === 0 ? "Free" : `$${tournament.entryFee}`}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0">
                            Join Tournament <ArrowRight className="w-3 h-3" />
                        </div>
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
}
