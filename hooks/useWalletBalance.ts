"use client";

import { useEffect, useReducer, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"; // ask about @solana/web3-compat
import { getAssociatedTokenAddress } from "@solana/spl-token";

const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// ── State & Reducer ────────────────────────────────────────────────────────────

type BalanceState = {
    sol: number | null;
    usdc: number | null;
    loading: boolean;
    error: string | null;
};

type Action =
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; sol: number; usdc: number }
    | { type: "FETCH_ERROR"; error: string }
    | { type: "RESET" };

const initialState: BalanceState = {
    sol: null,
    usdc: null,
    loading: false,
    error: null,
};

function reducer(state: BalanceState, action: Action): BalanceState {
    switch (action.type) {
        case "FETCH_START":
            return { ...state, loading: true, error: null };
        case "FETCH_SUCCESS":
            return { sol: action.sol, usdc: action.usdc, loading: false, error: null };
        case "FETCH_ERROR":
            return { sol: null, usdc: null, loading: false, error: action.error };
        case "RESET":
            return initialState;
        default:
            return state;
    }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useWalletBalance() {
    const { publicKey, connected } = useWallet();
    const { connection } = useConnection();

    const [state, dispatch] = useReducer(reducer, initialState);
    const [tick, forceRefresh] = useReducer((n: number) => n + 1, 0);

    const refresh = useCallback(() => forceRefresh(), []);

    // Reset when wallet disconnects — dispatch is stable, no lint warning
    useEffect(() => {
        if (!connected || !publicKey) {
            dispatch({ type: "RESET" });
        }
    }, [connected, publicKey]);

    // Fetch balances when connected
    useEffect(() => {
        if (!connected || !publicKey) return;

        let active = true;

        async function fetchBalances(key: PublicKey) {
            dispatch({ type: "FETCH_START" });

            try {
                const ata = await getAssociatedTokenAddress(USDC_MINT, key);

                const [lamports, usdcAcc] = await Promise.all([
                    connection.getBalance(key),
                    connection.getTokenAccountBalance(ata).catch(() => null),
                ]);

                const sol = lamports / LAMPORTS_PER_SOL;
                const usdc = usdcAcc
                    ? parseFloat(usdcAcc.value.uiAmountString ?? "0")
                    : 0;

                if (active) {
                    dispatch({ type: "FETCH_SUCCESS", sol, usdc });
                }
            } catch (err) {
                console.error("[useWalletBalance]", err);
                if (active) {
                    dispatch({ type: "FETCH_ERROR", error: "Failed to fetch wallet balance." });
                }
            }
        }

        fetchBalances(publicKey);

        return () => {
            active = false;
        };
    }, [connected, publicKey, connection, tick]);

    return { ...state, refresh };
}