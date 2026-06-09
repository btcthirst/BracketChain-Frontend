"use client";

import { useEffect, useState } from "react";
import type { UIGameChoice } from "@/types/tournament";

interface GameIdentityState {
    /** Whether the wallet has a SAS attestation for this game (true for Manual). */
    exists: boolean;
    /** Derived attestation PDA to pass to `joinTournament`; null for Manual. */
    attestationPda: string | null;
    loading: boolean;
}

/**
 * Reads a wallet's game-identity attestation from the indexer (A-11). Used by
 * the join flow to gate non-Manual tournaments behind a linked Steam identity
 * and to prefetch the attestation PDA for `joinTournament`.
 *
 * Manual games (and the no-wallet case) need no identity, so they resolve as
 * `{ exists: true/false }` with no network call. State is fully derived — the
 * effect only `setState`s inside async callbacks (React 19 forbids synchronous
 * setState in an effect body), and a `key` guards against returning a stale
 * result after the wallet/game changes.
 */
export function useGameIdentity(
    wallet: string | null,
    game: UIGameChoice,
): GameIdentityState {
    const baseUrl = process.env.NEXT_PUBLIC_INDEXER_URL;
    const enabled = game !== "manual" && !!wallet && !!baseUrl;
    const key = `${wallet ?? ""}:${game}`;

    const [fetched, setFetched] = useState<{
        key: string;
        exists: boolean;
        attestationPda: string | null;
    } | null>(null);

    useEffect(() => {
        if (!enabled || !wallet || !baseUrl) return;
        let active = true;
        const url =
            `${baseUrl.replace(/\/$/, "")}/identity/` +
            `${encodeURIComponent(wallet)}/${encodeURIComponent(game)}`;
        fetch(url)
            .then((r) =>
                r.ok
                    ? (r.json() as Promise<{ exists: boolean; attestationPda: string }>)
                    : Promise.reject(new Error(`identity ${r.status}`)),
            )
            .then((j) => {
                if (active)
                    setFetched({
                        key,
                        exists: Boolean(j.exists),
                        attestationPda: j.attestationPda ?? null,
                    });
            })
            .catch(() => {
                if (active) setFetched({ key, exists: false, attestationPda: null });
            });
        return () => {
            active = false;
        };
    }, [enabled, wallet, game, baseUrl, key]);

    // Manual / no-wallet: no attestation needed (Manual is "satisfied").
    if (!enabled) {
        return { exists: game === "manual", attestationPda: null, loading: false };
    }
    // Awaiting (or stale after a key change) → loading.
    if (!fetched || fetched.key !== key) {
        return { exists: false, attestationPda: null, loading: true };
    }
    return {
        exists: fetched.exists,
        attestationPda: fetched.attestationPda,
        loading: false,
    };
}
