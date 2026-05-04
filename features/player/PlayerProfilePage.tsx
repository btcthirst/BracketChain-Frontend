"use client";

import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProfileHeader } from "./components/ProfileHeader";
import { TournamentHistoryTable } from "./components/TournamentHistoryTable";
import { BadgesSection } from "./components/BadgesSection";
import { RefreshCw, Search } from "lucide-react";

interface Props {
    wallet: string;
}

export function PlayerProfilePage({ wallet }: Props) {
    const { state, refresh } = usePlayerProfile(wallet);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-6 py-8 max-w-6xl flex flex-col gap-8">
                {state.status === "loading" ? (
                    <ProfileSkeleton />
                ) : state.status === "not_found" ? (
                    <NotFoundState wallet={wallet} />
                ) : state.status === "error" ? (
                    <ErrorState onRetry={refresh} />
                ) : state.status === "empty" ? (
                    <div className="flex flex-col gap-8">
                         <ProfileHeader data={{ wallet, stats: { tournamentsPlayed: 0, wins: 0, losses: 0, winRate: 0, totalEarned: 0 }, history: [], badges: [] }} />
                         <EmptyHistory />
                    </div>
                ) : (
                    <div className="flex flex-col gap-8">
                        <ProfileHeader data={state.data} />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 flex flex-col gap-6">
                                <h2 className="text-xl font-bold text-gray-900">Tournament History</h2>
                                <TournamentHistoryTable history={state.data.history} />
                            </div>
                            
                            <div className="flex flex-col gap-6">
                                <h2 className="text-xl font-bold text-gray-900">Badges</h2>
                                <BadgesSection badges={state.data.badges} />
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}

function ProfileSkeleton() {
    return (
        <div className="flex flex-col gap-8 animate-pulse">
            <div className="h-48 bg-white rounded-2xl border border-gray-200" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 h-96 bg-white rounded-2xl border border-gray-200" />
                <div className="h-96 bg-white rounded-2xl border border-gray-200" />
            </div>
        </div>
    );
}

function NotFoundState({ wallet }: { wallet: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-300" />
            </div>
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-gray-900">Address not found</h2>
                <p className="text-gray-500 max-w-sm font-mono text-sm break-all">
                    {wallet}
                </p>
                <p className="text-gray-500 max-w-xs mx-auto">
                    No activity found for this address on BracketChain.
                </p>
            </div>
        </div>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-2xl border border-gray-200 text-center">
            <RefreshCw className="w-8 h-8 text-gray-300" />
            <p className="text-lg font-semibold text-gray-700">Failed to load profile</p>
            <p className="text-sm text-gray-500 mb-2">There was an error fetching the player data.</p>
            <button
                onClick={onRetry}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
                <RefreshCw className="w-4 h-4" /> Try again
            </button>
        </div>
    );
}

function EmptyHistory() {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                <Search className="w-8 h-8 text-blue-200" />
            </div>
            <p className="text-gray-600 font-medium">This player hasn’t competed in any BracketChain tournaments yet.</p>
        </div>
    );
}
