import { mapError } from "@bracketchain/sdk";
import { toast } from "sonner";

/**
 * Render a user-friendly toast for a failed wallet-signed transaction. Walks
 * the `cause` chain (SDK wraps program errors in `UnknownProgramError` whose
 * `cause` is the underlying `SolanaError` / wallet error) so we surface the
 * actual problem instead of "An unknown program error occurred".
 *
 * Returns true if a toast was shown; callers can treat that as "handled".
 * `opLabel` is used only in the console.error log for triage.
 */
export function handleTxError(err: unknown, opLabel: string): void {
    const text = collectMessages(err).join(" | ").toLowerCase();

    // Wallet was closed mid-flow (Backpack quirk) or signing rejected.
    if (text.includes("plugin closed")) {
        toast.info("Wallet was closed before approval — please reopen and retry.");
        console.warn(`${opLabel}: wallet closed before signing`, err);
        return;
    }
    if (text.includes("user rejected") || text.includes("rejected the request") || text.includes("rejected")) {
        toast.info("Request cancelled.");
        return;
    }
    // Wallet sign / sig verification edge cases (wallet adapter glitches).
    if (text.includes("did not pass signature verification")) {
        toast.error("Wallet returned an invalid signature — try disconnect + reconnect, then retry.");
        console.error(`${opLabel}: signature verification failed`, err);
        return;
    }
    // Blockhash expired (slow wallet approval > ~60s on devnet).
    if (text.includes("blockhash not found")) {
        toast.error("Network was slow — the transaction's blockhash expired. Please retry.");
        console.warn(`${opLabel}: blockhash expired`, err);
        return;
    }

    toast.error(mapError(err).message);
    console.error(`${opLabel} failed:`, err);
}

function collectMessages(err: unknown, depth = 0): string[] {
    if (depth > 6 || err == null) return [];
    const out: string[] = [];
    if (typeof err === "object" && err !== null) {
        const e = err as { message?: unknown; cause?: unknown };
        if (typeof e.message === "string") out.push(e.message);
        if (e.cause !== undefined && e.cause !== err) out.push(...collectMessages(e.cause, depth + 1));
    } else if (typeof err === "string") {
        out.push(err);
    }
    return out;
}
