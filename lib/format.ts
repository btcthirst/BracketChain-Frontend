/**
 * Truncate a base58 address/pubkey for display: `ABCD…WXYZ`.
 *
 * Returns the original string untouched when it's too short to truncate
 * meaningfully (head + tail + ellipsis ≥ length).
 */
export function shortenAddress(addr: string, head = 4, tail = 4): string {
    if (addr.length <= head + tail + 1) return addr;
    return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
