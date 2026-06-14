/**
 * Deterministic gradient avatar derived from a wallet address — zero deps.
 *
 * The same address always renders the same avatar (hash → two hues + angle),
 * so it reads as a stable identity placeholder until/if a real avatar
 * (Google picture, custom upload) is available.
 */

function hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h << 5) - h + s.charCodeAt(i);
        h |= 0; // force int32
    }
    return Math.abs(h);
}

export function Identicon({
    address,
    size = 40,
}: {
    address: string;
    size?: number;
}) {
    const h = hashString(address || "?");
    const hue1 = h % 360;
    const hue2 = (Math.floor(h / 7) % 360 + 90) % 360;
    const angle = h % 360;

    return (
        <div
            aria-hidden
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                flexShrink: 0,
                background: `conic-gradient(from ${angle}deg, hsl(${hue1} 68% 55%), hsl(${hue2} 68% 48%), hsl(${hue1} 68% 55%))`,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
            }}
        />
    );
}
