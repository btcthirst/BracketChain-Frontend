"use client";

import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { steamLaunchUrl, gameLabel } from "@/constants/games";

/**
 * "Launch <game>" button for Steam-verified tournaments. Fires the
 * `steam://rungameid/<appId>` protocol link, which the browser hands to the
 * local Steam client — Dota 2 boots without the player hunting through their
 * library. Renders nothing for `manual` (or non-Steam) games, so call sites
 * can include it unconditionally.
 */
export function LaunchGameButton({ game }: { game: string }) {
    const url = steamLaunchUrl(game);
    if (!url) return null;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => { window.location.href = url; }}
            >
                <Gamepad2 />
                Launch {gameLabel(game)}
            </Button>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", textAlign: "center", color: "rgba(240,241,245,0.3)" }}>
                Opens via Steam — make sure Steam is running.
            </p>
        </div>
    );
}
