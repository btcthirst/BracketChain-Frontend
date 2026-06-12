"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny global store for the user's chosen active wallet address.
 *
 * Privy's `useWallets()` can return several connected wallets; the rest of the
 * app needs one canonical "active" wallet for balance, signing and gating. This
 * persists the user's pick (localStorage) and exposes it via
 * `useSyncExternalStore` so every `useActiveWallet()` call site stays in sync —
 * no extra context provider in the tree.
 */

const KEY = "bc:activeWalletAddress";

let current: string | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
    if (hydrated) return;
    hydrated = true;
    try {
        current = localStorage.getItem(KEY);
    } catch {
        current = null;
    }
}

function subscribe(cb: () => void): () => void {
    hydrate(); // runs client-side only (effects), safe to touch localStorage
    listeners.add(cb);
    return () => listeners.delete(cb);
}

function getSnapshot(): string | null {
    return current;
}

/** Server render: no persisted selection (avoids hydration mismatch). */
function getServerSnapshot(): string | null {
    return null;
}

export function setActiveWalletAddress(address: string | null): void {
    current = address;
    try {
        if (address) localStorage.setItem(KEY, address);
        else localStorage.removeItem(KEY);
    } catch {
        // ignore persistence failures (private mode etc.)
    }
    listeners.forEach((l) => l());
}

/** The user's chosen active wallet address, or null if none picked yet. */
export function useActiveWalletSelection(): string | null {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
