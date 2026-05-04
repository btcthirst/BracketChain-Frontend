import type { TournamentStatus, TournamentFormat } from "./tournament";

export interface PlayerStats {
    tournamentsPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    totalEarned: number;
}

export interface PlayerTournamentHistory {
    id: string;
    name: string;
    date: string;
    format: TournamentFormat;
    placement: string; // e.g., "1st", "3rd", "5th-8th"
    prizeWon: number;
    game: string;
    status: TournamentStatus;
}

export interface PlayerBadge {
    id: string;
    tournamentName: string;
    placement: string;
    date: string;
    imageUrl: string;
    explorerUrl: string;
}

export interface PlayerProfileData {
    wallet: string;
    stats: PlayerStats;
    history: PlayerTournamentHistory[];
    badges: PlayerBadge[];
}
