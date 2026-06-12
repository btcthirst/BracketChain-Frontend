import type { PrivyClientConfig, User } from "@privy-io/react-auth";

/** The exact login-method union PrivyProvider's `loginMethods` accepts. */
type LoginMethod = NonNullable<PrivyClientConfig["loginMethods"]>[number];

export interface UserIdentity {
    email?: string;
    phone?: string;
}

interface MethodEntry {
    /** Value passed to PrivyProvider `loginMethods`. */
    method: LoginMethod;
    /** Optional: how to read a display identity (email/phone) from the user. */
    identity?: (user: User) => UserIdentity;
}

/**
 * Single source of truth for Privy authentication.
 *
 * ADD a login method → add an entry here (with its identity extractor, if any).
 * REMOVE one → delete its entry. Both the PrivyProvider config (`LOGIN_METHODS`)
 * and the account UI (`getUserIdentity`) derive from this one list, so the
 * enabled methods and the data we read off the user can never drift apart.
 */
const METHODS: MethodEntry[] = [
    { method: "wallet" },
    { method: "email", identity: (u) => ({ email: u.email?.address }) },
    { method: "sms", identity: (u) => ({ phone: u.phone?.number }) },
    { method: "google", identity: (u) => ({ email: u.google?.email ?? undefined }) },
    // Enable more by adding an entry — its identity is picked up automatically:
    // { method: "apple", identity: (u) => ({ email: u.apple?.email ?? undefined }) },
    // { method: "telegram", identity: (u) => ({ phone: u.telegram?.username }) },
];

/** Passed to `<PrivyProvider config={{ loginMethods }}>`. */
export const LOGIN_METHODS: LoginMethod[] = METHODS.map((m) => m.method);

/**
 * Derive a display identity (email/phone) from the Privy user, considering only
 * the enabled methods above. First non-empty value per field wins.
 */
export function getUserIdentity(user: User | null): UserIdentity {
    if (!user) return {};
    const out: UserIdentity = {};
    for (const { identity } of METHODS) {
        if (!identity) continue;
        const id = identity(user);
        if (id.email && !out.email) out.email = id.email;
        if (id.phone && !out.phone) out.phone = id.phone;
    }
    return out;
}
