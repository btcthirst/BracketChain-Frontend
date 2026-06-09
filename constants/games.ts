// Game metadata for game-tagged (Steam-verified) tournaments.
//
// Phase 1 supports Manual + Dota 2; CS2/Valorant/LoL slots arrive with V1.3
// adapters. `steamAppId` powers the `steam://rungameid/<id>` deep link that
// launches the game client straight from the browser (Steam protocol handler).

export interface GameMeta {
    /** Human label, e.g. shown on launch buttons and badges. */
    label: string;
    /** Steam store app ID; null for games not distributed via Steam. */
    steamAppId: number | null;
}

export const GAMES: Record<string, GameMeta> = {
    manual: { label: "Manual", steamAppId: null },
    dota2: { label: "Dota 2", steamAppId: 570 },
    // V1.3+: cs2 (730), valorant (Riot client — no Steam id), lol (Riot).
    cs2: { label: "CS2", steamAppId: 730 },
};

/**
 * Deep link that opens the game via the locally-installed Steam client.
 * Returns null for games without a Steam app id (incl. `manual`), so callers
 * can simply hide the launch affordance.
 */
export function steamLaunchUrl(game: string): string | null {
    const appId = GAMES[game]?.steamAppId ?? null;
    return appId ? `steam://rungameid/${appId}` : null;
}

/** Display label with a safe fallback for unknown/future game keys. */
export function gameLabel(game: string): string {
    return GAMES[game]?.label ?? game;
}
