import type { IndexerPlayer } from "@/lib/indexerClient";
import { mockPlayer } from "@/lib/mocks/playerProfile";

/**
 * Player-profile data source.
 *
 * The indexer has no reverse "tournaments by player" index yet, so we serve a
 * deterministic mock by default. When `GET /players/:wallet` ships, set
 * NEXT_PUBLIC_MOCK_PLAYER_PROFILE="false" to switch to the live endpoint — the
 * `IndexerPlayer` shape is identical, so no hooks/UI change.
 */
const USE_MOCK = process.env.NEXT_PUBLIC_MOCK_PLAYER_PROFILE !== "false";

export async function getPlayer(
    wallet: string,
    opts?: { signal?: AbortSignal },
): Promise<IndexerPlayer> {
    if (USE_MOCK) {
        // Small delay so the loading state is exercised, like a real request.
        await new Promise((r) => setTimeout(r, 250));
        if (opts?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        return mockPlayer(wallet);
    }

    const base = process.env.NEXT_PUBLIC_INDEXER_URL;
    if (!base) throw new Error("NEXT_PUBLIC_INDEXER_URL is not set");
    const res = await fetch(
        `${base.replace(/\/$/, "")}/players/${encodeURIComponent(wallet)}`,
        { signal: opts?.signal },
    );
    if (!res.ok) throw new Error(`getPlayer failed: ${res.status}`);
    return (await res.json()) as IndexerPlayer;
}

/** Whether profile data is currently mocked (for an optional "demo" badge). */
export const PLAYER_PROFILE_IS_MOCK = USE_MOCK;
