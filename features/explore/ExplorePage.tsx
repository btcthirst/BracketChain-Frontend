"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FilterBar } from "./components/FilterBar";
import { TournamentCard } from "./components/TournamentCard";
import { Search, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExplore, type ExploreFilters } from "@/hooks/useExplore";
import Link from "next/link";
import { ROUTES } from "@/constants/links";
import { MotionDiv } from "@/components/ui/motion-wraper";

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
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Navbar />

            <main
                style={{
                    flex: 1,
                    maxWidth: 1280,
                    margin: "0 auto",
                    padding: "48px 24px",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 32,
                }}
            >
                {/* Header */}
                <MotionDiv
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <p
                        style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "0.68rem",
                            color: "rgba(240,241,245,0.3)",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            marginBottom: 12,
                        }}
                    >
                        On-chain competitions
                    </p>
                    <h1
                        style={{
                            fontFamily: "'Syne', sans-serif",
                            fontWeight: 800,
                            fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                            color: "#f0f1f5",
                            letterSpacing: "-0.03em",
                            lineHeight: 1.1,
                            marginBottom: 12,
                        }}
                    >
                        Explore Tournaments
                    </h1>
                    <p style={{ fontSize: "0.95rem", color: "rgba(240,241,245,0.42)", maxWidth: 500 }}>
                        Discover the best on-chain competitions. Filter by game, prize pool, or status.
                    </p>
                </MotionDiv>

                {/* Filters */}
                <FilterBar
                    filters={filters}
                    onFilterChange={setFilters}
                    onClear={() => setFilters(INITIAL_FILTERS)}
                    totalCount={state.status !== "loading" ? state.total : undefined}
                />

                {/* Content */}
                {state.status === "error" ? (
                    <ErrorState onRetry={refresh} />
                ) : state.status === "loading" && state.data.length === 0 ? (
                    <LoadingGrid />
                ) : state.data.length === 0 ? (
                    <EmptyState onClear={() => setFilters(INITIAL_FILTERS)} />
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                                gap: 16,
                            }}
                        >
                            {state.data.map((t) => (
                                <TournamentCard key={t.id} tournament={t} />
                            ))}
                            {state.status === "loading" && <LoadingCards count={4} />}
                        </div>

                        {state.hasMore && (
                            <div style={{ display: "flex", justifyContent: "center", paddingBottom: 40 }}>
                                <Button
                                    variant="outline"
                                    onClick={loadMore}
                                    disabled={state.status === "loading"}
                                    className="px-8"
                                >
                                    {state.status === "loading" && <RefreshCw size={15} className="animate-spin" />}
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            <LoadingCards count={12} />
        </div>
    );
}

function LoadingCards({ count }: { count: number }) {
    return Array.from({ length: count }).map((_, i) => (
        <div
            key={i}
            style={{
                background: "rgba(13,15,24,0.8)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 14,
            }}
        >
            {[["55%", "0s"], ["35%", "0.1s"], ["75%", "0.05s"], ["45%", "0.15s"]].map(([w, d], j) => (
                <div
                    key={j}
                    style={{
                        height: j === 1 ? 24 : 11,
                        width: w,
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 4,
                        animation: `pulse 1.5s ease-in-out ${d} infinite`,
                    }}
                />
            ))}
        </div>
    ));
}

function EmptyState({ onClear }: { onClear: () => void }) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 24,
                padding: "80px 24px",
                background: "rgba(13,15,24,0.5)",
                border: "1px dashed rgba(255,255,255,0.08)",
                borderRadius: 16,
            }}
        >
            <div
                style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "rgba(34,212,126,0.06)",
                    border: "1px solid rgba(34,212,126,0.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Search size={22} style={{ color: "rgba(34,212,126,0.45)" }} />
            </div>
            <div>
                <p
                    style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: "1.05rem",
                        color: "#f0f1f5",
                        marginBottom: 8,
                    }}
                >
                    No tournaments match your filters
                </p>
                <p style={{ fontSize: "0.875rem", color: "rgba(240,241,245,0.35)", maxWidth: 320 }}>
                    Try adjusting your search terms or filters to find more competitions.
                </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Button variant="outline" onClick={onClear}>
                    Clear Filters
                </Button>
                <span style={{ fontSize: "0.78rem", color: "rgba(240,241,245,0.2)" }}>or</span>
                <Button variant="primary" asChild>
                    <Link href={ROUTES.create}>
                        <Plus className="size-[14px]" />
                        Create one
                    </Link>
                </Button>
            </div>
        </div>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 16,
                padding: "80px 24px",
                background: "rgba(13,15,24,0.5)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
            }}
        >
            <div
                style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "rgba(240,78,102,0.07)",
                    border: "1px solid rgba(240,78,102,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <RefreshCw size={20} style={{ color: "rgba(240,78,102,0.6)" }} />
            </div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#f0f1f5" }}>
                Unable to load tournaments
            </p>
            <p style={{ fontSize: "0.85rem", color: "rgba(240,241,245,0.35)" }}>Please try again.</p>
            <Button variant="outline" onClick={onRetry} className="mt-1">
                Retry
            </Button>
        </div>
    );
}
