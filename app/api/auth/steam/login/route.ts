import { NextRequest, NextResponse } from "next/server";

// Steam uses OpenID 2.0. We send a `checkid_setup` request with
// `identifier_select` so Steam picks the logged-in user, and point `return_to`
// at our callback (carrying the player's wallet + where to land afterwards).
const STEAM_OPENID = "https://steamcommunity.com/openid/login";

export function GET(req: NextRequest): NextResponse {
    const wallet = req.nextUrl.searchParams.get("wallet");
    const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "/";

    // The wallet is carried through the redirect so the callback knows which
    // wallet to bind the verified Steam identity to.
    // ⚠️ SECURITY TODO: this trusts that the initiator controls `wallet`. Before
    // production, require a wallet signature (signed nonce) so a user can't bind
    // their Steam ID to a wallet they don't own (which would grief the real
    // owner via the per-wallet attestation PDA). The indexer attest endpoint is
    // gated by IDENTITY_ATTEST_ENABLED until that lands.
    if (!wallet || wallet.length < 32 || wallet.length > 44) {
        return NextResponse.json(
            { error: "valid `wallet` query param required" },
            { status: 400 },
        );
    }

    const origin = req.nextUrl.origin;
    const callback = new URL("/api/auth/steam/callback", origin);
    callback.searchParams.set("wallet", wallet);
    callback.searchParams.set("returnTo", returnTo);

    const params = new URLSearchParams({
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "checkid_setup",
        "openid.return_to": callback.toString(),
        "openid.realm": origin,
        "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    });

    return NextResponse.redirect(`${STEAM_OPENID}?${params.toString()}`);
}
