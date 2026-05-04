"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";
import type { PlayerBadge } from "@/types/player";

interface Props {
    badges: PlayerBadge[];
}

export function BadgesSection({ badges }: Props) {
    if (badges.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-200">
                    <AwardIcon className="w-6 h-6" />
                </div>
                <p className="text-sm text-gray-400">No badges earned yet.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4">
            {badges.map((badge) => (
                <a 
                    key={badge.id}
                    href={badge.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3 hover:border-blue-300 transition-all hover:shadow-md"
                >
                    <div className="aspect-square rounded-xl bg-gray-50 overflow-hidden relative">
                        <Image 
                            src={badge.imageUrl} 
                            alt={badge.tournamentName} 
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-gray-900 border border-gray-100 shadow-sm">
                            {badge.placement}
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-0.5">
                        <h3 className="text-xs font-bold text-gray-900 truncate">{badge.tournamentName}</h3>
                        <p className="text-[10px] text-gray-400">{new Date(badge.date).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        View on Explorer
                        <ExternalLink className="w-2.5 h-2.5" />
                    </div>
                </a>
            ))}
        </div>
    );
}

function AwardIcon({ className }: { className?: string }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <circle cx="12" cy="8" r="6" />
            <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
    );
}
