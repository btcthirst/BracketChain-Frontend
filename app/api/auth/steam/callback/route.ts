import { NextRequest, NextResponse } from "next/server";

const STEAM_OPENID = "https://steamcommunity.com/openid/login";
// Steam returns the identity as https://steamcommunity.com/openid/id/<steamId64>.
const CLAIMED_ID_RE = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

/**
 * Steam OpenID return handler. Verifies the assertion **server-side** via
 * `check_authentication` (never trust the client-supplied params), extracts the
 * 17-digit Steam ID 64, then asks the indexer to issue the wallet↔Steam SAS
 * attestation. Finally redirects back to `returnTo` with a `steam=<status>`
 * query param the UI can react to (`linked` / `invalid` / `attest_failed` / …).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
    const sp = req.nextUrl.searchParams;
    const wallet = sp.get("wallet");
    const returnTo = sp.get("returnTo") ?? "/";

    const redirectBack = (
        status: string,
        extra?: Record<string, string>,
    ): NextResponse => {
        const url = new URL(returnTo, req.nextUrl.origin);
        url.searchParams.set("steam", status);
        for (const [k, v] of Object.entries(extra ?? {})) {
            url.searchParams.set(k, v);
        }
        return NextResponse.redirect(url);
    };

    if (!wallet) return redirectBack("error");

    // 1. Verify the assertion: echo all openid.* params back to Steam with
    //    mode=check_authentication; Steam answers `is_valid:true` if genuine.
    const verifyParams = new URLSearchParams();
    for (const [k, v] of sp.entries()) {
        if (k.startsWith("openid.")) verifyParams.set(k, v);
    }
    verifyParams.set("openid.mode", "check_authentication");

    let verifyText: string;
    try {
        const res = await fetch(STEAM_OPENID, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: verifyParams.toString(),
        });
        verifyText = await res.text();
    } catch {
        return redirectBack("verify_failed");
    }
    if (!/is_valid\s*:\s*true/i.test(verifyText)) {
        return redirectBack("invalid");
    }

    // 2. Extract the Steam ID 64 from the verified claimed_id.
    const claimedId = sp.get("openid.claimed_id") ?? "";
    const match = CLAIMED_ID_RE.exec(claimedId);
    if (!match) return redirectBack("error");
    const steamId64 = match[1];

    // 3. Issue the attestation via the indexer (gated by IDENTITY_ATTEST_ENABLED
    //    server-side). On any failure, still report the verified steamId so the
    //    UI can show "verified but not attested".
    const indexer = process.env.NEXT_PUBLIC_INDEXER_URL;
    if (!indexer) return redirectBack("no_indexer", { steamId: steamId64 });

    try {
        const res = await fetch(
            `${indexer.replace(/\/$/, "")}/identity/steam/attest`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ wallet, steamId64 }),
            },
        );
        if (!res.ok) return redirectBack("attest_failed", { steamId: steamId64 });
        return redirectBack("linked", { steamId: steamId64 });
    } catch {
        return redirectBack("attest_failed", { steamId: steamId64 });
    }
}
