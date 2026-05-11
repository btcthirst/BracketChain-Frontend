"use client";

import { Search, X, LayoutGrid, Gamepad2 } from "lucide-react";
import type { ExploreFilters, ExploreStatus } from "@/hooks/useExplore";

interface Props {
    filters: ExploreFilters;
    onFilterChange: (filters: ExploreFilters) => void;
    onClear: () => void;
    totalCount?: number;
}

// Six filter buckets. `RegistrationClosed` is synthetic — see useExplore.ts.
// LIVE pulses (most active state); Closed shows a static amber dot to flag
// "deadline passed but program hasn't transitioned the on-chain status yet."
const STATUSES: {
    value: ExploreStatus;
    label: string;
    indicator?: { color: string; pulse?: boolean };
}[] = [
        { value: "All", label: "All" },
        { value: "Active", label: "Live", indicator: { color: "#f04e66", pulse: true } },
        { value: "Registration", label: "Upcoming" },
        { value: "RegistrationClosed", label: "Closed", indicator: { color: "#f5a623" } },
        { value: "Completed", label: "Completed" },
        { value: "Cancelled", label: "Cancelled" },
    ];

const FORMATS = ["All", "SE", "DE", "Swiss", "RR"];
const GAMES = ["All", "Counter-Strike 2", "Dota 2", "League of Legends", "Valorant", "StarCraft II"];

const selectStyle: React.CSSProperties = {
    height: 40,
    padding: "0 32px 0 12px",
    background: "rgba(30,33,50,0.8)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "rgba(240,241,245,0.7)",
    fontSize: "0.82rem",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
    outline: "none",
    minWidth: 120,
    appearance: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2322d47e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' opacity='0.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    minHeight: "unset",
};

export function FilterBar({ filters, onFilterChange, onClear, totalCount }: Props) {
    const activeTags: { id: string; label: string; clear: () => void }[] = [];
    if (filters.game !== "All") {
        activeTags.push({ id: "game", label: filters.game, clear: () => onFilterChange({ ...filters, game: "All" }) });
    }
    if (filters.format !== "All") {
        activeTags.push({ id: "format", label: filters.format, clear: () => onFilterChange({ ...filters, format: "All" }) });
    }
    if (filters.minPrize > 0 || filters.maxPrize < 10000) {
        activeTags.push({
            id: "prize",
            label: `$${filters.minPrize.toLocaleString()} – $${filters.maxPrize.toLocaleString()}${filters.maxPrize >= 10000 ? "+" : ""}`,
            clear: () => onFilterChange({ ...filters, minPrize: 0, maxPrize: 10000 }),
        });
    }
    if (filters.freeOnly) {
        activeTags.push({ id: "free", label: "Free Entry", clear: () => onFilterChange({ ...filters, freeOnly: false }) });
    }

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                background: "rgba(13,15,24,0.8)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "20px 20px",
            }}
        >
            {/* Row 1: Search + Status tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                {/* Search */}
                <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 400 }}>
                    <Search
                        size={15}
                        style={{
                            position: "absolute",
                            left: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "rgba(240,241,245,0.25)",
                            pointerEvents: "none",
                        }}
                    />
                    <input
                        placeholder="Search tournament name…"
                        value={filters.search}
                        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                        style={{
                            width: "100%",
                            height: 40,
                            paddingLeft: 36,
                            paddingRight: 14,
                            background: "rgba(30,33,50,0.8)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8,
                            color: "#f0f1f5",
                            fontSize: "0.85rem",
                            fontFamily: "'Inter', sans-serif",
                            outline: "none",
                            transition: "border-color 0.15s",
                            minHeight: "unset",
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(34,212,126,0.4)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    />
                </div>

                {/* Status tabs — six buckets driven by STATUSES const */}
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 8,
                        padding: 3,
                    }}
                >
                    {STATUSES.map(({ value, label, indicator }) => {
                        const active = filters.status === value;
                        return (
                            <button
                                key={value}
                                onClick={() => onFilterChange({ ...filters, status: value })}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "6px 14px",
                                    borderRadius: 6,
                                    border: "none",
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: "0.8rem",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    transition: "background 0.15s, color 0.15s",
                                    ...(active
                                        ? { background: "rgba(34,212,126,0.12)", color: "#22d47e" }
                                        : { background: "transparent", color: "rgba(240,241,245,0.4)" }),
                                }}
                            >
                                {indicator && (
                                    <span
                                        style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: "50%",
                                            background: active ? "#22d47e" : indicator.color,
                                            flexShrink: 0,
                                            ...(indicator.pulse && !active ? { animation: "pulse 1.5s ease-in-out infinite" } : {}),
                                        }}
                                    />
                                )}
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Row 2: Advanced filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                {/* Format */}
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <LayoutGrid size={13} style={{ position: "absolute", left: 10, color: "rgba(34,212,126,0.5)", pointerEvents: "none", zIndex: 1 }} />
                    <select
                        value={filters.format}
                        onChange={(e) => onFilterChange({ ...filters, format: e.target.value })}
                        style={{ ...selectStyle, paddingLeft: 28 }}
                    >
                        {FORMATS.map(f => (
                            <option key={f} value={f}>{f === "All" ? "All Formats" : f}</option>
                        ))}
                    </select>
                </div>

                {/* Game */}
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <Gamepad2 size={13} style={{ position: "absolute", left: 10, color: "rgba(34,212,126,0.5)", pointerEvents: "none", zIndex: 1 }} />
                    <select
                        value={filters.game}
                        onChange={(e) => onFilterChange({ ...filters, game: e.target.value })}
                        style={{ ...selectStyle, paddingLeft: 28, minWidth: 150 }}
                    >
                        {GAMES.map(g => (
                            <option key={g} value={g}>{g === "All" ? "All Games" : g}</option>
                        ))}
                    </select>
                </div>

                {/* Prize range slider */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        height: 40,
                        padding: "0 14px",
                        background: "rgba(30,33,50,0.8)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8,
                        flex: 1,
                        minWidth: 200,
                    }}
                >
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "rgba(240,241,245,0.3)", whiteSpace: "nowrap" }}>
                        Prize $
                    </span>
                    <div
                        className="range-slider"
                        style={{ position: "relative", flex: 1, height: 20, display: "flex", alignItems: "center" }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                height: 3,
                                width: "100%",
                                borderRadius: 999,
                                pointerEvents: "none",
                                background: `linear-gradient(to right, rgba(255,255,255,0.08) ${(filters.minPrize / 10000) * 100}%, #22d47e ${(filters.minPrize / 10000) * 100}%, #22d47e ${(filters.maxPrize / 10000) * 100}%, rgba(255,255,255,0.08) ${(filters.maxPrize / 10000) * 100}%)`,
                            }}
                        />
                        <input
                            type="range"
                            min={0}
                            max={10000}
                            step={100}
                            value={filters.minPrize}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                onFilterChange({ ...filters, minPrize: Math.min(v, filters.maxPrize - 100) });
                            }}
                        />
                        <input
                            type="range"
                            min={0}
                            max={10000}
                            step={100}
                            value={filters.maxPrize}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                onFilterChange({ ...filters, maxPrize: Math.max(v, filters.minPrize + 100) });
                            }}
                        />
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "#22d47e", whiteSpace: "nowrap" }}>
                        {filters.minPrize.toLocaleString()} – {filters.maxPrize.toLocaleString()}{filters.maxPrize >= 10000 ? "+" : ""}
                    </span>
                </div>

                {/* Free entry toggle */}
                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        height: 40,
                        padding: "0 12px",
                        background: "rgba(30,33,50,0.8)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8,
                        cursor: "pointer",
                        userSelect: "none",
                    }}
                >
                    <div
                        onClick={() => onFilterChange({ ...filters, freeOnly: !filters.freeOnly })}
                        style={{
                            position: "relative",
                            width: 32,
                            height: 18,
                            borderRadius: 999,
                            background: filters.freeOnly ? "#22d47e" : "rgba(255,255,255,0.1)",
                            transition: "background 0.2s",
                            flexShrink: 0,
                        }}
                    >
                        <span
                            style={{
                                position: "absolute",
                                top: 2,
                                left: filters.freeOnly ? 16 : 2,
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                background: "#f0f1f5",
                                transition: "left 0.2s",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                            }}
                        />
                    </div>
                    <span style={{ fontSize: "0.82rem", fontWeight: 500, color: filters.freeOnly ? "#22d47e" : "rgba(240,241,245,0.45)" }}>
                        Free Entry
                    </span>
                </label>
            </div>

            {/* Row 3: Active tags + count */}
            {(activeTags.length > 0 || totalCount !== undefined) && (
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        paddingTop: 14,
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                        {activeTags.map(tag => (
                            <div
                                key={tag.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "3px 10px",
                                    background: "rgba(34,212,126,0.08)",
                                    border: "1px solid rgba(34,212,126,0.20)",
                                    borderRadius: 999,
                                    fontSize: "0.72rem",
                                    fontFamily: "'DM Mono', monospace",
                                    color: "#22d47e",
                                    letterSpacing: "0.02em",
                                }}
                            >
                                {tag.label}
                                <button
                                    onClick={tag.clear}
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "rgba(34,212,126,0.6)", lineHeight: 1 }}
                                >
                                    <X size={11} />
                                </button>
                            </div>
                        ))}
                        {activeTags.length > 0 && (
                            <button
                                onClick={onClear}
                                style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "0.75rem",
                                    color: "rgba(240,241,245,0.3)",
                                    fontFamily: "'Inter', sans-serif",
                                    padding: "0 4px",
                                    transition: "color 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.7)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.3)"; }}
                            >
                                Clear all
                            </button>
                        )}
                    </div>
                    {totalCount !== undefined && (
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "rgba(240,241,245,0.3)", letterSpacing: "0.04em" }}>
                            <span style={{ color: "#f0f1f5", fontWeight: 600 }}>{totalCount}</span> tournaments
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
