"use client";

import { useCallback } from "react";
import type confettiLib from "canvas-confetti";

// Lazy import to avoid SSR issues
async function getConfetti(): Promise<typeof confettiLib> {
    const mod = await import("canvas-confetti");
    return mod.default;
}

export function useConfetti() {
    const fire = useCallback(async () => {
        const confetti = await getConfetti();

        const count = 220;
        const defaults = { origin: { y: 0.7 } };

        function fireBurst(particleRatio: number, opts: confettiLib.Options) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio),
            });
        }

        // Solana-themed colors: green + blue + purple
        const colors = ["#10b981", "#3b82f6", "#8b5cf6", "#ffffff", "#f59e0b"];

        fireBurst(0.25, { spread: 26, startVelocity: 55, colors });
        fireBurst(0.20, { spread: 60, colors });
        fireBurst(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors });
        fireBurst(0.10, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors });
        fireBurst(0.10, { spread: 120, startVelocity: 45, colors });

        // Second wave after short delay
        setTimeout(async () => {
            const confetti2 = await getConfetti();
            confetti2({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
                colors,
            });
        }, 400);
    }, []);

    return { fire };
}