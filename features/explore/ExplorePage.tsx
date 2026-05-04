"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FilterBar } from "./components/FilterBar";
import { TournamentCard } from "./components/TournamentCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, Plus, RefreshCw } from "lucide-react";
import { useExplore, type ExploreFilters } from "@/hooks/useExplore";
import Link from "next/link";
import { ROUTES } from "@/constants/links";

const INITIAL_FILTERS: ExploreFilters = {
    status: "All",
    format: "All",
    minPrize: 0,
    maxPrize: 10000,
    freeOnly: false,
    game: "All",
    search: "",
};

export function ExplorePage() {
    const [filters, setFilters] = useState<ExploreFilters>(INITIAL_FILTERS);
    const { state, loadMore, refresh } = useExplore(filters);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            
            <main className="flex-1 container mx-auto px-6 py-8 max-w-7xl flex flex-col gap-8">
                {/* Page Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        Explore Tournaments
                        {state.status !== "loading" && (
                            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                {state.total} Found
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-500 max-w-2xl">
                        Discover the best on-chain competitions. Filter by game, prize pool, or status 
                        and start your journey to the top.
                    </p>
                </div>

                {/* Filters */}
                <FilterBar 
                    filters={filters} 
                    onFilterChange={setFilters} 
                    onClear={() => setFilters(INITIAL_FILTERS)} 
                />

                {/* Content Area */}
                {state.status === "error" ? (
                    <ErrorState onRetry={refresh} />
                ) : state.status === "loading" && state.data.length === 0 ? (
                    <LoadingGrid />
                ) : state.data.length === 0 ? (
                    <EmptyState onClear={() => setFilters(INITIAL_FILTERS)} />
                ) : (
                    <div className="flex flex-col gap-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {state.data.map((t) => (
                                <TournamentCard key={t.id} tournament={t} />
                            ))}
                            {state.status === "loading" && <LoadingCards count={4} />}
                        </div>

                        {state.hasMore && (
                            <div className="flex justify-center pb-10">
                                <Button 
                                    variant="outline" 
                                    size="lg" 
                                    onClick={loadMore}
                                    disabled={state.status === "loading"}
                                    className="bg-white px-10 h-14 font-bold rounded-xl border-2 hover:bg-gray-50 transition-all active:scale-95"
                                >
                                    {state.status === "loading" ? (
                                        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                                    ) : null}
                                    Load More Tournaments
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}

function LoadingGrid() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <LoadingCards count={12} />
        </div>
    );
}

function LoadingCards({ count }: { count: number }) {
    return Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-6 w-3/4" />
            <div className="flex gap-2">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex flex-col gap-2 mt-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
            </div>
        </div>
    ));
}

function EmptyState({ onClear }: { onClear: () => void }) {
    return (
        <div className="bg-white rounded-3xl border border-gray-200 border-dashed p-16 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                <Search className="w-10 h-10 text-blue-200" />
            </div>
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-gray-900">No tournaments match your filters</h2>
                <p className="text-gray-500 max-w-sm">
                    Try adjusting your search terms or filters to find more competitions.
                </p>
            </div>
            <div className="flex items-center gap-3">
                <Button variant="outline" onClick={onClear} className="font-bold px-6">
                    Clear Filters
                </Button>
                <span className="text-sm font-medium text-gray-400">or</span>
                <Link href={ROUTES.create}>
                    <Button className="bg-blue-600 hover:bg-blue-700 font-bold px-6">
                        <Plus className="w-4 h-4 mr-2" />
                        Create one?
                    </Button>
                </Link>
            </div>
        </div>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="bg-white rounded-3xl border border-red-100 p-16 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-red-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Unable to load tournaments</h2>
            <p className="text-gray-500">Please check your connection and try again.</p>
            <Button onClick={onRetry} variant="outline" className="mt-2 font-bold px-8">
                Retry
            </Button>
        </div>
    );
}
