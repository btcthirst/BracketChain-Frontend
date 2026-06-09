"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const STATUS: Record<string, { kind: "success" | "error" | "info"; msg: string }> = {
    linked: { kind: "success", msg: "Steam linked — identity attestation issued." },
    invalid: { kind: "error", msg: "Steam verification failed. Please try again." },
    expired: { kind: "error", msg: "Steam link request expired. Please try again." },
    attest_failed: {
        kind: "error",
        msg: "Steam verified, but issuing the on-chain attestation failed.",
    },
};

/**
 * Surfaces the `?steam=<status>` the indexer appends when redirecting back from
 * the Steam-link flow (A-11): fires a one-shot toast, then scrubs the param from
 * the URL so a refresh doesn't re-toast. Reads `useSearchParams`, so callers
 * must render it inside a `<Suspense>` boundary (Next.js requirement).
 */
export function SteamStatusToast() {
    const status = useSearchParams().get("steam");
    const pathname = usePathname();
    const router = useRouter();
    const fired = useRef(false);

    useEffect(() => {
        if (!status || fired.current) return;
        fired.current = true;

        const entry = STATUS[status];
        if (entry) toast[entry.kind](entry.msg);

        // Scrub the steam params so the toast doesn't replay on refresh.
        const params = new URLSearchParams(window.location.search);
        params.delete("steam");
        params.delete("steamId");
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, [status, pathname, router]);

    return null;
}
