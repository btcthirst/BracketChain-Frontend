"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ExploreFilters } from "@/hooks/useExplore";
import type { IndexerTournamentStatus } from "@/lib/indexer";

interface Props {
    filters: ExploreFilters;
    onFilterChange: (filters: ExploreFilters) => void;
    onClear: () => void;
}

const FORMATS = ["All", "SE", "DE", "Swiss", "RR"];
const GAMES = ["All", "Counter-Strike 2", "Dota 2", "League of Legends", "Valorant", "StarCraft II"];

export function FilterBar({ filters, onFilterChange, onClear }: Props) {
    return (
        <div className="flex flex-col gap-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            {/* Search and Main Status */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search tournament name..."
                        className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                        value={filters.search}
                        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                    />
                </div>

                <Tabs 
                    value={filters.status} 
                    onValueChange={(v) => onFilterChange({ ...filters, status: v as IndexerTournamentStatus | "All" })}
                    className="w-full md:w-auto"
                >
                    <TabsList className="grid grid-cols-4 w-full md:w-[400px] h-11 p-1 bg-gray-100">
                        <TabsTrigger value="All" className="text-xs md:text-sm">All</TabsTrigger>
                        <TabsTrigger value="Registration" className="text-xs md:text-sm">Upcoming</TabsTrigger>
                        <TabsTrigger value="Active" className="text-xs md:text-sm">Live</TabsTrigger>
                        <TabsTrigger value="Completed" className="text-xs md:text-sm">Completed</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                {/* Format Dropdown */}
                <div className="flex flex-col gap-2">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Format</Label>
                    <Select 
                        value={filters.format} 
                        onValueChange={(v) => onFilterChange({ ...filters, format: v })}
                    >
                        <SelectTrigger className="h-10 bg-gray-50 border-gray-200">
                            <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                            {FORMATS.map(f => (
                                <SelectItem key={f} value={f}>{f === "All" ? "All Formats" : f}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Game Dropdown */}
                <div className="flex flex-col gap-2">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Game</Label>
                    <Select 
                        value={filters.game} 
                        onValueChange={(v) => onFilterChange({ ...filters, game: v })}
                    >
                        <SelectTrigger className="h-10 bg-gray-50 border-gray-200">
                            <SelectValue placeholder="Select game" />
                        </SelectTrigger>
                        <SelectContent>
                            {GAMES.map(g => (
                                <SelectItem key={g} value={g}>{g === "All" ? "All Games" : g}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Prize Range */}
                <div className="flex flex-col gap-4 lg:col-span-1">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prize Pool</Label>
                        <span className="text-xs font-bold text-blue-600">
                            Up to ${filters.maxPrize.toLocaleString()}{filters.maxPrize >= 10000 ? "+" : ""}
                        </span>
                    </div>
                    <Slider
                        defaultValue={[filters.maxPrize]}
                        max={10000}
                        step={100}
                        onValueChange={([v]) => onFilterChange({ ...filters, maxPrize: v })}
                        className="py-2"
                    />
                </div>

                {/* Free Toggle and Clear */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-2">
                        <Switch 
                            id="free-only" 
                            checked={filters.freeOnly}
                            onCheckedChange={(v) => onFilterChange({ ...filters, freeOnly: v })}
                        />
                        <Label htmlFor="free-only" className="text-sm font-medium text-gray-700 cursor-pointer">
                            Free Only
                        </Label>
                    </div>

                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={onClear}
                        className="text-gray-400 hover:text-gray-900 h-10 px-3"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Clear
                    </Button>
                </div>
            </div>
        </div>
    );
}
