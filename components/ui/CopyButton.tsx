"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Copy, Check } from "lucide-react";

/**
 * Click-to-copy button with transient "copied" feedback. Copies `value` to the
 * clipboard and swaps the icon to a check for 1.5s. Safe no-op when the
 * Clipboard API is unavailable (insecure context / denied).
 */
export function CopyButton({
    value,
    title = "Copy",
    iconSize = 13,
    style,
    children,
}: {
    value: string;
    title?: string;
    iconSize?: number;
    style?: CSSProperties;
    children?: ReactNode;
}) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    async function copy() {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard API unavailable — no-op.
        }
    }

    return (
        <button
            type="button"
            onClick={copy}
            title={copied ? "Copied!" : title}
            aria-label={title}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: "none",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                font: "inherit",
                padding: 0,
                ...style,
            }}
        >
            {children}
            {copied ? (
                <Check size={iconSize} style={{ color: "#22d47e", flexShrink: 0 }} />
            ) : (
                <Copy size={iconSize} style={{ flexShrink: 0, opacity: 0.7 }} />
            )}
        </button>
    );
}
