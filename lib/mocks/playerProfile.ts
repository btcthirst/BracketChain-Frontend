import type {
    IndexerBracketFormat,
    IndexerGame,
    IndexerPlayer,
    IndexerPlayerHistoryRow,
} from "@/lib/indexerClient";

/**
 * Deterministic mock player profile, derived from the wallet address so a given
 * address always yields the same stats/history across renders and sessions.
 *
 * Stand-in until the indexer ships `GET /players/:wallet` — see
 * lib/playerSource.ts for the swap. Returns the real `IndexerPlayer` shape so
 * no UI depends on this being mocked.
 */

function hash(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Small deterministic PRNG seeded from a 32-bit int. */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const GAMES: IndexerGame[] = ["Dota2", "Cs2Faceit", "Valorant", "LoL", "Manual"];
const FORMATS: IndexerBracketFormat[] = [
    "SingleElimination",
    "DoubleElimination",
    "Swiss",
    "RoundRobin",
];
const NAMES = [
    "Midnight Clash",
    "Apex Invitational",
    "Devnet Open",
    "Solana Showdown",
    "Bracket Royale",
    "Grand Ladder",
    "Prime Cup",
    "Sunday Skirmish",
    "Velocity Series",
    "Aurora Arena",
];

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function fakeAddress(rng: () => number): string {
    let out = "";
    for (let i = 0; i < 44; i++) out += B58[Math.floor(rng() * B58.length)];
    return out;
}

export function mockPlayer(wallet: string): IndexerPlayer {
    const rng = mulberry32(hash(wallet));
    const played = 3 + Math.floor(rng() * 8); // 3..10

    const history: IndexerPlayerHistoryRow[] = [];
    let wins = 0;
    let totalEarned = 0n;

    for (let i = 0; i < played; i++) {
        const placement = 1 + Math.floor(rng() * 8); // 1..8
        if (placement === 1) wins++;

        // Prize only for podium finishes, scaled by placement.
        const prizeUsd =
            placement === 1
                ? 200 + Math.floor(rng() * 600)
                : placement <= 3
                  ? 40 + Math.floor(rng() * 120)
                  : 0;
        const prizeMicro = BigInt(prizeUsd) * 1_000_000n;
        totalEarned += prizeMicro;

        history.push({
            tournamentAddress: fakeAddress(rng),
            name: `${NAMES[i % NAMES.length]} #${1 + Math.floor(rng() * 99)}`,
            game: GAMES[Math.floor(rng() * GAMES.length)],
            format: FORMATS[Math.floor(rng() * FORMATS.length)],
            placement,
            prizeMicro: prizeMicro.toString(),
            date: new Date(Date.now() - i * 6 * 86_400_000).toISOString(),
            status: "Completed",
        });
    }

    return {
        wallet,
        stats: {
            played,
            wins,
            losses: played - wins,
            winRate: played > 0 ? wins / played : 0,
            totalEarnedMicro: totalEarned.toString(),
        },
        history,
    };
}
