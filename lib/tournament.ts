// lib/tournament.ts
import type { IndexerTournament } from "@/lib/indexer";

export interface Tournament {
    id: string;
    name: string;
    game: string;
    format: "SE" | "DE" | "Swiss" | "RR";
    status: "Registration" | "PendingBracketInit" | "Active" | "Completed" | "Cancelled";
    prizePool: number;
    participants: number;
    maxParticipants: number;
    entryFee: number;
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
    const entryFeeMicro = BigInt(t.entryFee || "0");
    const organizerDepositMicro = BigInt(t.organizerDeposit || "0");
    const maxParticipants = t.maxParticipants || 0;

    // Variant B (plan 2026-05-03): organizer_deposit is part of the prize pool.
    // - Completed: indexer's `grossPool` is the on-chain `vault.amount` at
    //   completion (= entry fees + deposit). Use it directly.
    // - Registration / Active: `grossPool` is null; fallback shows the MAX
    //   potential pool = entryFee × maxParticipants + deposit.
    const grossMicro = t.grossPool != null
        ? BigInt(t.grossPool)
        : entryFeeMicro * BigInt(maxParticipants) + organizerDepositMicro;
    const prizePool = Number(grossMicro) / USDC_DECIMALS;

    // Estimate participants from grossPool by subtracting the deposit first
    // (grossPool includes it under Variant B).
    const participants = entryFeeMicro > 0n && t.grossPool != null
        ? Math.max(0, Number((BigInt(t.grossPool) - organizerDepositMicro) / entryFeeMicro))
        : 0;

    return {
        id: t.address,
        name: t.name,
        game: "On-chain",
        format: "SE",
        status: t.status,
        prizePool,
        participants,
        maxParticipants,
        entryFee: Number(entryFeeMicro) / USDC_DECIMALS,
        startsIn: formatStartsIn(t.registrationDeadline || new Date().toISOString(), now),
    };
}
