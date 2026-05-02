// lib/tournament.ts
import { IndexerTournament } from "./indexer";

export interface Tournament {
    id: string;
    name: string;
    game: string;
    format: "SE" | "DE" | "Swiss" | "RR";
    prizePool: number;
    participants: number;
    maxParticipants: number;
    startsIn: string;
}

const USDC_DECIMALS = 1_000_000;

export function formatStartsIn(deadlineIso: string, now: number = Date.now()): string {
    const deadline = new Date(deadlineIso).getTime();
    const ms = deadline - now;
    if (ms <= 0) return "Registration closed";
    
    const totalMin = Math.floor(ms / 60_000);
    if (totalMin < 60) return `${totalMin}m`;
    
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    
    const days = Math.floor(hours / 24);
    const hoursLeft = hours % 24;
    return hoursLeft > 0 ? `${days}d ${hoursLeft}h` : `${days}d`;
}

export function toUiTournament(t: IndexerTournament, now: number = Date.now()): Tournament {
    const entryFeeMicro = BigInt(t.entryFee);
    const grossMicro = t.grossPool != null ? BigInt(t.grossPool) : entryFeeMicro * BigInt(t.maxParticipants);
    const prizePool = Number(grossMicro) / USDC_DECIMALS;

    // Estimate participants from grossPool if available, otherwise 0
    const participants = entryFeeMicro > 0n && t.grossPool != null 
        ? Number(BigInt(t.grossPool) / entryFeeMicro)
        : 0;

    return {
        id: t.address,
        name: t.name,
        game: "On-chain",
        format: "SE",
        prizePool,
        participants,
        maxParticipants: t.maxParticipants,
        startsIn: formatStartsIn(t.registrationDeadline, now),
    };
}
