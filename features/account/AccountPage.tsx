"use client";

import Link from "next/link";
import {
    usePrivy,
    useUnlinkEmail,
    useUnlinkPhone,
    useUnlinkWallet,
    useUnlinkOAuth,
} from "@privy-io/react-auth";
import { useFundWallet, useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { Mail, Phone, Plus, LogOut, ExternalLink, Wallet, CreditCard, User as UserIcon, Check } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Identicon } from "@/components/ui/Identicon";
import { CopyButton } from "@/components/ui/CopyButton";
import { ROUTES, SOLANA } from "@/constants/links";
import { shortenAddress } from "@/lib/format";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { setActiveWalletAddress } from "@/lib/activeWalletStore";

const UNLINK_DISABLED_HINT = "You can't remove your only login method";

async function runUnlink(fn: () => Promise<unknown>) {
    try {
        await fn();
        toast.success("Unlinked");
    } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't unlink. Try again.");
    }
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-transparent flex flex-col font-sans selection:bg-[#22d47e]/30">
            <Navbar />
            <main className="flex-1 relative z-10">{children}</main>
            <Footer />
        </div>
    );
}

function Gate() {
    const { login } = usePrivy();
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#22d47e]/10 border border-[#22d47e]/20 flex items-center justify-center">
                <UserIcon className="w-10 h-10 text-[#22d47e]" />
            </div>
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold text-[#f0f1f5]">Sign in to view your account</h2>
                <p className="max-w-xs mx-auto" style={{ color: "rgba(240,241,245,0.42)", fontSize: "0.925rem" }}>
                    Manage your linked accounts, wallet and funds.
                </p>
            </div>
            <Button variant="primary" size="lg" onClick={login} className="px-10">
                Login / Signup
            </Button>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
            <h2 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(240,241,245,0.4)" }}>
                {title}
            </h2>
            {children}
        </section>
    );
}

function LinkButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5"
            style={{ background: "rgba(34,212,126,0.10)", border: "1px solid rgba(34,212,126,0.30)", color: "#86efac", fontSize: "0.78rem", cursor: "pointer" }}
        >
            <Plus size={13} /> Link
        </button>
    );
}

function UnlinkButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={disabled ? UNLINK_DISABLED_HINT : "Unlink"}
            className="ml-auto inline-flex items-center rounded-lg px-3 py-1.5"
            style={{
                background: "transparent",
                border: "1px solid rgba(240,78,102,0.3)",
                color: "rgba(240,100,100,0.85)",
                fontSize: "0.78rem",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.4 : 1,
            }}
        >
            Unlink
        </button>
    );
}

function LinkedRow({
    icon,
    label,
    value,
    onLink,
    onUnlink,
    canUnlink,
}: {
    icon: React.ReactNode;
    label: string;
    value?: string;
    onLink: () => void;
    onUnlink?: () => void;
    canUnlink?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 py-2">
            <span style={{ color: "rgba(240,241,245,0.5)", display: "inline-flex" }}>{icon}</span>
            <div className="flex flex-col min-w-0">
                <span style={{ fontSize: "0.72rem", color: "rgba(240,241,245,0.4)" }}>{label}</span>
                <span style={{ fontSize: "0.9rem", color: "#f0f1f5", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {value ?? <span style={{ color: "rgba(240,241,245,0.35)" }}>Not linked</span>}
                </span>
            </div>
            {value
                ? onUnlink && <UnlinkButton onClick={onUnlink} disabled={!canUnlink} />
                : <LinkButton onClick={onLink} />}
        </div>
    );
}

/** A linked external wallet may be unlinked; the embedded (Privy) wallet may not. */
function isEmbeddedWallet(walletClientType?: string): boolean {
    return walletClientType === "privy" || walletClientType === "privy-v2";
}

function AccountContent() {
    const { user, logout, linkEmail, linkPhone, linkGoogle, linkWallet } = usePrivy();
    const { unlink: unlinkEmail } = useUnlinkEmail();
    const { unlink: unlinkPhone } = useUnlinkPhone();
    const { unlink: unlinkWallet } = useUnlinkWallet();
    const { unlink: unlinkOAuth } = useUnlinkOAuth();
    const { address } = useActiveWallet();
    const { wallets: connectedWallets } = useSolanaWallets();
    const connectedAddrs = new Set(connectedWallets.map((w) => w.address));
    const { sol, usdc } = useWalletBalance();
    const { fundWallet } = useFundWallet();

    const email = user?.email?.address ?? user?.google?.email ?? undefined;
    const phone = user?.phone?.number ?? undefined;
    const googleName = user?.google?.name ?? user?.google?.email ?? undefined;
    const displayName = googleName || email || (address ? shortenAddress(address) : "Account");

    const linkedAccounts = user?.linkedAccounts ?? [];
    const linkedWallets = linkedAccounts.filter(
        (a): a is Extract<typeof a, { type: "wallet" }> => a.type === "wallet",
    );
    // Privy requires keeping ≥1 login method. The embedded wallet isn't one, so
    // exclude it from the count; unlink is disabled when only one remains.
    const loginMethodCount = linkedAccounts.filter(
        (a) => !(a.type === "wallet" && isEmbeddedWallet(a.walletClientType)),
    ).length;
    const canUnlink = loginMethodCount > 1;

    return (
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Identicon address={address ?? displayName} size={56} />
                <div className="flex flex-col min-w-0">
                    <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f0f1f5", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {displayName}
                    </h1>
                    {address && (
                        <Link href={ROUTES.player(address)} style={{ fontSize: "0.8rem", color: "#22d47e" }}>
                            View public profile →
                        </Link>
                    )}
                </div>
            </div>

            {/* Linked accounts */}
            <Section title="Linked accounts">
                <LinkedRow
                    icon={<Mail size={16} />}
                    label="Email"
                    value={user?.email?.address}
                    onLink={linkEmail}
                    canUnlink={canUnlink}
                    onUnlink={
                        user?.email?.address
                            ? () => runUnlink(() => unlinkEmail({ address: user.email!.address }))
                            : undefined
                    }
                />
                <LinkedRow
                    icon={<span style={{ fontSize: "0.85rem", fontWeight: 700 }}>G</span>}
                    label="Google"
                    value={user?.google?.email}
                    onLink={linkGoogle}
                    canUnlink={canUnlink}
                    onUnlink={
                        user?.google?.subject
                            ? () => runUnlink(() => unlinkOAuth({ provider: "google", subject: user.google!.subject }))
                            : undefined
                    }
                />
                <LinkedRow
                    icon={<Phone size={16} />}
                    label="Phone"
                    value={phone}
                    onLink={linkPhone}
                    canUnlink={canUnlink}
                    onUnlink={
                        user?.phone?.number
                            ? () => runUnlink(() => unlinkPhone({ phoneNumber: user.phone!.number }))
                            : undefined
                    }
                />
                {email && !user?.email?.address && (
                    <span style={{ fontSize: "0.72rem", color: "rgba(240,241,245,0.35)" }}>
                        Email shown is from your Google account.
                    </span>
                )}
            </Section>

            {/* Wallet */}
            <Section title="Wallet">
                {address ? (
                    <>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Wallet size={16} style={{ color: "rgba(240,241,245,0.5)" }} />
                            <CopyButton value={address} title="Copy address" style={{ color: "#f0f1f5", fontSize: "0.9rem", fontFamily: "'DM Mono', monospace" }}>
                                {shortenAddress(address, 6, 6)}
                            </CopyButton>
                            <a href={SOLANA.explorerAddr(address)} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(240,241,245,0.5)" }} title="View on Solana Explorer">
                                <ExternalLink size={13} />
                            </a>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex flex-col">
                                <span style={{ fontSize: "0.7rem", color: "rgba(240,241,245,0.4)", textTransform: "uppercase" }}>SOL</span>
                                <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f0f1f5" }}>{sol != null ? sol.toFixed(4) : "—"}</span>
                            </div>
                            <div className="flex flex-col">
                                <span style={{ fontSize: "0.7rem", color: "rgba(240,241,245,0.4)", textTransform: "uppercase" }}>USDC</span>
                                <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f0f1f5" }}>{usdc != null ? usdc.toFixed(2) : "—"}</span>
                            </div>
                        </div>
                        <Button variant="primary" onClick={() => fundWallet({ address })} className="self-start mt-1">
                            <CreditCard size={15} /> Add funds
                        </Button>
                    </>
                ) : (
                    <span style={{ color: "rgba(240,241,245,0.5)", fontSize: "0.9rem" }}>No wallet connected.</span>
                )}
            </Section>

            {/* Linked wallets */}
            <Section title="Linked wallets">
                {linkedWallets.length === 0 && (
                    <span style={{ color: "rgba(240,241,245,0.4)", fontSize: "0.85rem" }}>No wallets linked.</span>
                )}
                {linkedWallets.map((w) => {
                    const embedded = isEmbeddedWallet(w.walletClientType);
                    const isActive = w.address === address;
                    const isConnected = connectedAddrs.has(w.address);
                    return (
                        <div key={w.address} className="flex items-center gap-3 py-2">
                            <Identicon address={w.address} size={28} />
                            <div className="flex flex-col min-w-0">
                                <CopyButton value={w.address} title="Copy address" style={{ color: "#f0f1f5", fontSize: "0.88rem", fontFamily: "'DM Mono', monospace" }}>
                                    {shortenAddress(w.address, 5, 5)}
                                </CopyButton>
                                <span style={{ fontSize: "0.72rem", color: "rgba(240,241,245,0.4)" }}>
                                    {embedded ? "Embedded" : (w.walletClientType ?? "External")}
                                </span>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                {isActive ? (
                                    <span
                                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1"
                                        style={{ background: "rgba(34,212,126,0.10)", border: "1px solid rgba(34,212,126,0.30)", color: "#86efac", fontSize: "0.72rem" }}
                                    >
                                        <Check size={12} /> Active
                                    </span>
                                ) : isConnected ? (
                                    <button
                                        type="button"
                                        onClick={() => setActiveWalletAddress(w.address)}
                                        className="rounded-lg px-2.5 py-1"
                                        style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(240,241,245,0.7)", fontSize: "0.72rem", cursor: "pointer" }}
                                    >
                                        Set active
                                    </button>
                                ) : (
                                    <span style={{ fontSize: "0.68rem", color: "rgba(240,241,245,0.3)" }}>not connected</span>
                                )}
                                {!embedded && (
                                    <UnlinkButton onClick={() => runUnlink(() => unlinkWallet({ address: w.address }))} disabled={!canUnlink} />
                                )}
                            </div>
                        </div>
                    );
                })}
                <button
                    type="button"
                    onClick={() => linkWallet()}
                    className="self-start inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 mt-1"
                    style={{ background: "rgba(34,212,126,0.10)", border: "1px solid rgba(34,212,126,0.30)", color: "#86efac", fontSize: "0.8rem", cursor: "pointer" }}
                >
                    <Plus size={14} /> Link wallet
                </button>
            </Section>

            {/* Sign out */}
            <button
                type="button"
                onClick={logout}
                className="self-start inline-flex items-center gap-2 rounded-lg px-4 py-2"
                style={{ border: "1px solid rgba(240,78,102,0.3)", background: "transparent", color: "rgba(240,100,100,0.85)", cursor: "pointer", fontSize: "0.875rem" }}
            >
                <LogOut size={15} /> Logout
            </button>
        </div>
    );
}

export function AccountPage() {
    const { ready, authenticated } = usePrivy();

    if (!ready) {
        return (
            <Shell>
                <div className="flex items-center justify-center min-h-[70vh]" style={{ color: "rgba(240,241,245,0.4)" }}>
                    Loading…
                </div>
            </Shell>
        );
    }

    return <Shell>{authenticated ? <AccountContent /> : <Gate />}</Shell>;
}
