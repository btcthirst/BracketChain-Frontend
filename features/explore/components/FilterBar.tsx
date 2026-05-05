"use client";

import { Search, X, LayoutGrid, Gamepad2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ExploreFilters } from "@/hooks/useExplore";
import type { IndexerTournamentStatus } from "@bracketchain/sdk";

interface Props {
    filters: ExploreFilters;
    onFilterChange: (filters: ExploreFilters) => void;
    onClear: () => void;
    totalCount?: number;
}

const FORMATS = ["All", "SE", "DE", "Swiss", "RR"];
const GAMES = ["All", "Counter-Strike 2", "Dota 2", "League of Legends", "Valorant", "StarCraft II"];

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
            label: `$${filters.minPrize.toLocaleString()} - $${filters.maxPrize.toLocaleString()}${filters.maxPrize >= 10000 ? "+" : ""}`, 
            clear: () => onFilterChange({ ...filters, minPrize: 0, maxPrize: 10000 }) 
        });
    }
    if (filters.freeOnly) {
        activeTags.push({ id: "free", label: "Free Entry", clear: () => onFilterChange({ ...filters, freeOnly: false }) });
    }

    return (
        <div className="flex flex-col gap-5 bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm">
            {/* Row 1: Search and Main Status */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-[400px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search tournament name..."
                        className="pl-11 h-12 rounded-full bg-white border-gray-200 focus:bg-white transition-all shadow-sm"
                        value={filters.search}
                        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                    />
                </div>

                <Tabs
                    value={filters.status}
                    onValueChange={(v) => onFilterChange({ ...filters, status: v as IndexerTournamentStatus | "All" })}
                    className="w-full md:w-auto"
                >
                    <TabsList className="grid grid-cols-4 w-full md:w-auto h-12 p-1 bg-white border border-gray-200 rounded-full shadow-sm">
                        <TabsTrigger value="All" className="rounded-full px-6 text-sm">All</TabsTrigger>
                        <TabsTrigger value="Active" className="rounded-full px-6 text-sm flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            Live
                        </TabsTrigger>
                        <TabsTrigger value="Registration" className="rounded-full px-6 text-sm">Upcoming</TabsTrigger>
                        <TabsTrigger value="Completed" className="rounded-full px-6 text-sm">Completed</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Row 2: Advanced Filters (Pills) */}
            <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full">
                {/* Format Dropdown */}
                <Select
                    value={filters.format}
                    onValueChange={(v) => onFilterChange({ ...filters, format: v })}
                >
                    <SelectTrigger className="h-11 rounded-full bg-white border-gray-200 w-full md:w-[140px] px-4 gap-2 shadow-sm shrink-0">
                        <LayoutGrid className="w-4 h-4 text-gray-500" />
                        <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                        {FORMATS.map(f => (
                            <SelectItem key={f} value={f}>{f === "All" ? "All Formats" : f}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Game Dropdown */}
                <Select
                    value={filters.game}
                    onValueChange={(v) => onFilterChange({ ...filters, game: v })}
                >
                    <SelectTrigger className="h-11 rounded-full bg-white border-gray-200 w-full md:w-[160px] px-4 gap-2 shadow-sm shrink-0">
                        <Gamepad2 className="w-4 h-4 text-gray-500" />
                        <SelectValue placeholder="Game" />
                    </SelectTrigger>
                    <SelectContent>
                        {GAMES.map(g => (
                            <SelectItem key={g} value={g}>{g === "All" ? "All Games" : g}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Prize Range */}
                <div className="flex-1 flex items-center h-11 px-5 rounded-full border border-gray-200 bg-white gap-4 w-full shadow-sm min-w-[280px]">
                    <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Prize Pool</span>
                    <Slider
                        value={[filters.minPrize, filters.maxPrize]}
                        min={0}
                        max={10000}
                        step={100}
                        onValueChange={([min, max]) => onFilterChange({ ...filters, minPrize: min, maxPrize: max })}
                        className="flex-1"
                        rangeClassName={filters.minPrize > 0 || filters.maxPrize < 10000 ? "bg-blue-500" : "bg-gray-300"}
                        thumbClassName={filters.minPrize > 0 || filters.maxPrize < 10000 ? "border-blue-500 bg-blue-500" : "border-gray-400 bg-gray-400 hover:ring-gray-200 focus-visible:ring-gray-200"}
                    />
                    <span className={`text-sm font-medium whitespace-nowrap ${filters.minPrize > 0 || filters.maxPrize < 10000 ? "text-blue-600" : "text-gray-400"}`}>
                        ${filters.minPrize.toLocaleString()} - ${filters.maxPrize.toLocaleString()}{filters.maxPrize >= 10000 ? "+" : ""}
                    </span>
                </div>

                {/* Free Toggle */}
                <div className="flex items-center h-11 px-5 rounded-full border border-gray-200 bg-white gap-3 shadow-sm shrink-0">
                    <Switch
                        id="free-only"
                        checked={filters.freeOnly}
                        onCheckedChange={(v) => onFilterChange({ ...filters, freeOnly: v })}
                    />
                    <label htmlFor="free-only" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                        Free Entry
                    </label>
                </div>
            </div>

            {/* Row 3: Active Filters & Results Count */}
            {(activeTags.length > 0 || totalCount !== undefined) && (
                <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-gray-100">
                    <div className="flex flex-wrap items-center gap-2">
                        {activeTags.map(tag => (
                            <div key={tag.id} className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                                {tag.label}
                                <button onClick={tag.clear} className="hover:text-blue-900 focus:outline-none">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {activeTags.length > 0 && (
                            <button onClick={onClear} className="text-xs text-gray-500 hover:text-gray-900 ml-2 font-medium">
                                Clear All
                            </button>
                        )}
                    </div>
                    {totalCount !== undefined && (
                        <div className="text-sm text-gray-600 font-medium">
                            <span className="font-bold text-gray-900">{totalCount}</span> tournaments found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}