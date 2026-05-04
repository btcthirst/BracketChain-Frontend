"use client";

import { useState } from "react";
import { Copy, Check, Trophy, Target, Award, DollarSign } from "lucide-react";
import type { PlayerProfileData } from "@/types/player";

interface Props {
    data: PlayerProfileData;
}

export function ProfileHeader({ data }: Props) {
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        navigator.clipboard.writeText(data.wallet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const truncatedWallet = `${data.wallet.slice(0, 6)}…${data.wallet.slice(-4)}`;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-[#0a1929] h-24 relative">
                {/* Decorative background or pattern could go here */}
            </div>
            
            <div className="px-8 pb-8 -mt-12 flex flex-col md:flex-row gap-6 items-start md:items-end">
                {/* Avatar Placeholder */}
                <div className="w-24 h-24 rounded-2xl bg-white p-1 border-4 border-white shadow-lg">
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                        {data.wallet.slice(2, 4).toUpperCase()}
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900 font-mono">{truncatedWallet}</h1>
                        <button 
                            onClick={handleCopy}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                            title="Copy wallet address"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-sm text-gray-500">Public Player Profile</p>
                </div>
            </div>

            <div className="px-8 pb-8 grid grid-cols-2 md:grid-cols-5 gap-4 border-t border-gray-100 pt-6">
                <StatCard 
                    label="Played" 
                    value={String(data.stats.tournamentsPlayed)} 
                    icon={<Target className="w-4 h-4 text-blue-500" />} 
                />
                <StatCard 
                    label="Wins" 
                    value={String(data.stats.wins)} 
                    icon={<Trophy className="w-4 h-4 text-yellow-500" />} 
                />
                <StatCard 
                    label="Losses" 
                    value={String(data.stats.losses)} 
                    icon={<Award className="w-4 h-4 text-gray-400" />} 
                />
                <StatCard 
                    label="Win Rate" 
                    value={`${data.stats.winRate}%`} 
                    icon={<BarChartIcon className="w-4 h-4 text-indigo-500" />} 
                />
                <StatCard 
                    label="Total Earned" 
                    value={`$${data.stats.totalEarned.toLocaleString()}`} 
                    icon={<DollarSign className="w-4 h-4 text-green-500" />} 
                />
            </div>
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {icon}
                {label}
            </div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
        </div>
    );
}

function BarChartIcon({ className }: { className?: string }) {
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
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
    );
}
