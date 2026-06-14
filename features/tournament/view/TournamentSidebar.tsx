"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, CheckCircle2, Loader2, ChevronDown, ChevronUp, Clock, Wallet } from "lucide-react";
import { address } from "@solana/kit";
import {
    joinTournament,
    startTournament,
    requestSeed,
    revealSeed,
    getTournament,
    SettlementMode,
    mapError,
} from "@bracketchain/sdk";
import { usePrivy } from "@privy-io/react-auth";
import { useSignTransaction } from "@privy-io/react-auth/solana";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { commitRandomness, buildRevealKitInstruction } from "@/lib/switchboardRandomness";
import { toast } from "sonner";
import type { TournamentView, Player } from "@/types/tournament";
import { ROUTES, SOLANA } from "@/constants/links";
import { useBracketChainClient } from "@/lib/sdk";
import { useConfetti } from "@/hooks/useConfetti";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useDeadlineReached } from "@/hooks/useDeadlineReached";
import { useGameIdentity } from "@/hooks/useGameIdentity";
import { Button } from "@/components/ui/button";
import { LinkSteamButton } from "@/features/auth/steam/LinkSteamButton";
import { LaunchGameButton } from "@/features/tournament/view/LaunchGameButton";
import { steamLaunchUrl, gameLabel } from "@/constants/games";

const sectionLabel: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.65rem",
    fontWeight: 500,
    color: "rgba(240,241,245,0.3)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
};

const darkRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
};

// ── Participant list ───────────────────────────────────────────────────────────

function ParticipantList({ participants, currentAddress, maxParticipants }: { participants: Player[]; currentAddress: string | null; maxParticipants: number }) {
    const fillPct = (participants.length / maxParticipants) * 100;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={sectionLabel}>Participants</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem" }}>
                    <span style={{ color: "#f0f1f5", fontWeight: 600 }}>{participants.length}</span>
                    <span style={{ color: "rgba(240,241,245,0.3)" }}>/{maxParticipants}</span>
                </span>
            </div>

            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${fillPct}%`, background: "linear-gradient(90deg, #22d47e, #4ade80)", borderRadius: 999, transition: "width 0.4s ease" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 208, overflowY: "auto" }}>
                {participants.map(p => {
                    const isYou = p.address === currentAddress;
                    return (
                        <div
                            key={p.address}
                            style={{
                                ...darkRow,
                                background: isYou ? "rgba(34,212,126,0.06)" : "rgba(255,255,255,0.03)",
                                border: `1px solid ${isYou ? "rgba(34,212,126,0.18)" : "rgba(255,255,255,0.06)"}`,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <Link
                                    href={ROUTES.player(p.address)}
                                    style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: isYou ? "#22d47e" : "rgba(240,241,245,0.65)", textDecoration: "none" }}
                                    onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                                    onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                                >
                                    {p.display}
                                </Link>
                                {p.isOrganizer && (
                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", fontWeight: 600, color: "#22d47e", background: "rgba(34,212,126,0.08)", border: "1px solid rgba(34,212,126,0.18)", padding: "1px 6px", borderRadius: 999 }}>
                                        ORG
                                    </span>
                                )}
                                {isYou && (
                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", fontWeight: 600, color: "rgba(34,212,126,0.6)" }}>You</span>
                                )}
                            </div>
                            <a
                                href={SOLANA.explorerAddr(p.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "rgba(240,241,245,0.2)", transition: "color 0.15s" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#22d47e")}
                                onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,241,245,0.2)")}
                            >
                                <ExternalLink style={{ width: 12, height: 12 }} />
                            </a>
                        </div>
                    );
                })}

                {Array.from({ length: Math.max(0, maxParticipants - participants.length) }).map((_, i) => (
                    <div key={`empty-${i}`} style={{ ...darkRow, border: "1px dashed rgba(255,255,255,0.07)", opacity: 0.5 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "rgba(240,241,245,0.2)", fontStyle: "italic" }}>Open slot</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Escrow / payout panel ─────────────────────────────────────────────────────

function EscrowPanel({ tournament, payoutsExpanded, setPayoutsExpanded, payoutsRef }: { tournament: TournamentView; payoutsExpanded: boolean; setPayoutsExpanded: (v: boolean) => void; payoutsRef: React.RefObject<HTMLDivElement | null> }) {
    const total = tournament.prizePool;
    const afterFee = total * 0.965;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={sectionLabel}>Prize Pool</span>

            <div style={{ background: "rgba(6,7,11,0.7)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.8rem", color: "#22d47e", letterSpacing: "-0.02em", lineHeight: 1 }}>
                        {total.toLocaleString()}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "rgba(240,241,245,0.35)" }}>{tournament.token}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tournament.payouts.map(entry => (
                        <div key={entry.place} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Mono', monospace", fontSize: "0.68rem" }}>
                                <span style={{ color: "rgba(240,241,245,0.35)" }}>{entry.label} — {entry.pct}%</span>
                                <span style={{ color: "#f0f1f5", fontWeight: 600 }}>{entry.amount.toLocaleString()} {tournament.token}</span>
                            </div>
                            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${entry.pct}%`, background: "linear-gradient(90deg, #22d47e, #4ade80)", borderRadius: 999 }} />
                            </div>
                        </div>
                    ))}
                </div>

                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "rgba(240,241,245,0.2)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                    Net to winners after 3.5% protocol fee: {afterFee.toLocaleString()} {tournament.token}
                </p>
            </div>

            {tournament.status === "completed" && (
                <div ref={payoutsRef} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button
                        onClick={() => setPayoutsExpanded(!payoutsExpanded)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", fontWeight: 500, color: "rgba(240,241,245,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", transition: "color 0.15s", padding: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "rgba(240,241,245,0.6)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,241,245,0.3)")}
                    >
                        <span>Payout Transactions</span>
                        {payoutsExpanded ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
                    </button>

                    {payoutsExpanded && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {tournament.payouts.map(entry => (
                                <div key={entry.place} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(34,212,126,0.05)", border: "1px solid rgba(34,212,126,0.12)", borderRadius: 8 }}>
                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "rgba(240,241,245,0.55)" }}>
                                        {entry.label} — {entry.recipient?.display ?? "—"}
                                    </span>
                                    {entry.txSignature ? (
                                        <a href={SOLANA.explorerTx(entry.txSignature)} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "#22d47e", textDecoration: "none" }}>
                                            {entry.txSignature.slice(0, 8)}…
                                            <ExternalLink style={{ width: 10, height: 10 }} />
                                        </a>
                                    ) : (
                                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "rgba(240,241,245,0.25)" }}>Pending</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Organizer panel ───────────────────────────────────────────────────────────

function OrganizerPanel({ organizer, arbitrator, showArbitrator }: { organizer: Player; arbitrator: string | null; showArbitrator: boolean }) {
    // V1.2 always sets arbitrator = organizer at create-time; suppress the
    // redundant row in that case. The row appears only if a Squads multisig
    // (V1.3) is configured, OR if the indexer hasn't reconciled yet and the
    // arbitrator differs from the organizer for some other reason.
    const showRow = showArbitrator && arbitrator !== null && arbitrator !== organizer.address;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={sectionLabel}>Organizer</span>
            <div style={darkRow}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Link
                        href={ROUTES.player(organizer.address)}
                        style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "rgba(240,241,245,0.65)", textDecoration: "none" }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                    >
                        {organizer.display}
                    </Link>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", fontWeight: 600, color: "#22d47e", background: "rgba(34,212,126,0.08)", border: "1px solid rgba(34,212,126,0.18)", padding: "1px 6px", borderRadius: 999 }}>ORG</span>
                    {showArbitrator && arbitrator === organizer.address && (
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", fontWeight: 600, color: "#5eb6ff", background: "rgba(94,182,255,0.08)", border: "1px solid rgba(94,182,255,0.18)", padding: "1px 6px", borderRadius: 999 }} title="Resolves disputed oracle proposals">ARB</span>
                    )}
                </div>
                <a href={SOLANA.explorerAddr(organizer.address)} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(240,241,245,0.2)", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#22d47e")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,241,245,0.2)")}
                    title="View on Solana Explorer"
                >
                    <ExternalLink style={{ width: 13, height: 13 }} />
                </a>
            </div>
            {showRow && (
                <>
                    <span style={sectionLabel}>Arbitrator</span>
                    <div style={darkRow}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "rgba(240,241,245,0.65)" }} title={arbitrator!}>
                            {arbitrator!.slice(0, 4)}…{arbitrator!.slice(-4)}
                        </span>
                        <a href={SOLANA.explorerAddr(arbitrator!)} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(240,241,245,0.2)", transition: "color 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#22d47e")}
                            onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,241,245,0.2)")}
                            title="View on Solana Explorer"
                        >
                            <ExternalLink style={{ width: 13, height: 13 }} />
                        </a>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Cancel danger zone ────────────────────────────────────────────────────────

function CancelDangerZone({ onCancel }: { onCancel: () => void }) {
    return (
        <Button variant="destructive" className="w-full" onClick={onCancel}>
            Cancel Tournament & Refund
        </Button>
    );
}

// ── Action area ───────────────────────────────────────────────────────────────

function ActionArea({
    tournament,
    currentAddress,
    isOrganizer,
    onJoinSuccess,
    onStartSuccess,
    onRefresh,
    onViewPayouts,
    onCancel,
}: {
    tournament: TournamentView;
    currentAddress: string | null;
    isOrganizer: boolean;
    onJoinSuccess: () => void;
    onStartSuccess: () => void;
    onRefresh: () => void;
    onViewPayouts: () => void;
    onCancel: () => void;
}) {
    const [joining, setJoining] = useState(false);
    const [starting, setStarting] = useState(false);
    // Sub-step label shown on the Start button while the VRF seeding ceremony
    // runs (non-OrganizerOnly tournaments). Null = idle / plain start.
    const [startStage, setStartStage] = useState<string | null>(null);
    const [optimisticJoined, setOptimisticJoined] = useState(false);

    const sdk = useBracketChainClient();
    const { connection } = useConnection();
    const { login } = usePrivy();
    // Privy owns the wallet (not wallet-adapter), so source the address from
    // `useActiveWallet` and sign through Privy. The VRF ceremony's web3.js lane
    // (`commitRandomness`) needs a web3.js PublicKey + a legacy-tx signer, so we
    // adapt Privy's signer to that shape here. Both are null until connected;
    // handleStart guards on them before use.
    const { wallet, address: activeAddress } = useActiveWallet();
    const { signTransaction: privySignTransaction } = useSignTransaction();
    const solanaChain =
        process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
            ? "solana:mainnet"
            : "solana:devnet";
    const publicKey = activeAddress ? new PublicKey(activeAddress) : null;
    const signTransaction = wallet
        ? async (tx: Transaction): Promise<Transaction> => {
              const serialized = tx.serialize({
                  requireAllSignatures: false,
                  verifySignatures: false,
              });
              const { signedTransaction } = await privySignTransaction({
                  transaction: serialized,
                  wallet,
                  chain: solanaChain,
              });
              return Transaction.from(signedTransaction);
          }
        : null;
    const { fire } = useConfetti();
    const { usdc: walletUsdc, refresh: refreshBalance } = useWalletBalance();

    // A-11: non-Manual tournaments require a linked game identity (Steam → SAS).
    // Prefetch the attestation so we can gate Join and pass the PDA to the SDK.
    const gameIdentity = useGameIdentity(currentAddress, tournament.gameKind);
    const needsIdentity =
        tournament.gameKind !== "manual" && !!currentAddress && !gameIdentity.exists;
    const linkSteamRef = useRef<HTMLDivElement | null>(null);

    const isParticipant = optimisticJoined || tournament.participants.some(p => p.address === currentAddress);

    // Dota has no lobby deep link, so the Launch button copies the lobby id
    // for in-client Custom Lobbies search. The relevant id is the committed
    // lobby of the viewer's own unfinished match (at most one at a time in
    // single-elim). Null when none is committed yet — the button still works,
    // it just launches without copying.
    const myMatch =
        tournament.matches.find(
            (m) =>
                m.status !== "completed" &&
                m.oracle.lobbyId !== null &&
                (m.playerA?.address === currentAddress ||
                    m.playerB?.address === currentAddress),
        ) ?? null;
    const myLobbyId = myMatch?.oracle.lobbyId ?? null;
    // Player-hosted manual lobby (option C): host = playerA, fixed by on-chain
    // seating so both clients agree without coordination. undefined when the
    // viewer isn't seated in the match (e.g. organizer) → symmetric copy.
    const iAmHost = myMatch
        ? myMatch.playerA?.address === currentAddress
        : undefined;

    const hasEnough = walletUsdc !== null && walletUsdc >= tournament.entryFee;
    const registrationClosed = useDeadlineReached(tournament.registrationDeadline);

    async function handleJoin() {
        if (!sdk) { toast.error("Connect your wallet to join"); return; }
        // A-11: gate non-Manual tournaments on a linked game identity. Without
        // it the program rejects with AttestationRequired, so fail fast with a
        // clear prompt + scroll the Link Steam button into view.
        if (tournament.gameKind !== "manual" && !gameIdentity.exists) {
            toast.error("Link your Steam account first to join this tournament.");
            linkSteamRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        setJoining(true);
        try {
            await joinTournament(sdk, {
                tournamentPda: address(tournament.id),
                gameIdentityAttestation: gameIdentity.attestationPda
                    ? address(gameIdentity.attestationPda)
                    : undefined,
            });
            // Steam-verified games: offer a one-click jump into the game client
            // right from the success toast (user gesture keeps the protocol
            // link reliable — browsers may block steam:// without one).
            const launchUrl = steamLaunchUrl(tournament.gameKind);
            if (launchUrl) {
                toast.success("Joined tournament successfully!", {
                    action: {
                        label: `Launch ${gameLabel(tournament.gameKind)}`,
                        onClick: () => { window.location.href = launchUrl; },
                    },
                });
            } else {
                toast.success("Joined tournament successfully!");
            }
            setOptimisticJoined(true);
            fire();
            refreshBalance();
            onJoinSuccess();
        } catch (err: unknown) {
            const error = err as Error;
            if (error.message?.toLowerCase().includes("rejected")) { toast.info("Request cancelled"); return; }
            const sdkErr = mapError(err);
            if (sdkErr.message.includes("balance") || sdkErr.constructor.name === "InsufficientBalanceError") {
                toast.error(
                    <div className="flex flex-col gap-1">
                        <span className="font-semibold">Insufficient Balance</span>
                        <span className="text-xs opacity-90">{sdkErr.message}</span>
                        <a
                            href="https://spl-token-faucet.com"
                            target="_blank"
                            className="mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-200 hover:text-white underline"
                        >
                            Get Devnet USDC →
                        </a>
                    </div>
                );
            } else {
                toast.error(sdkErr.message);
            }
            if (/registration|closed|full|status/i.test(sdkErr.message)) {
                onRefresh();
            }
            console.error("Join failed:", err);
        } finally { setJoining(false); }
    }

    // Reveal the VRF seed in the organizer's OWN transaction — no keeper /
    // indexer / webhook dependency (works locally with no tunnel, and survives a
    // keeper outage in prod). Switchboard On-Demand only exposes the value in the
    // slot it's revealed, so the Switchboard reveal is bundled ahead of the
    // program's `reveal_seed` in ONE tx. We retry the BUILD (no wallet prompt)
    // until the oracle posts the value (a few slots after commit), then send once
    // (a single signature). If the permissionless cron beat us to it, `seedRevealed`
    // is already true and we return early.
    async function revealSeedAsOrganizer(
        pda: ReturnType<typeof address>,
        randomnessAccount: string,
        payer: string,
    ) {
        const buildAttempts = 15;
        let revealIx: Awaited<
            ReturnType<typeof buildRevealKitInstruction>
        > | null = null;
        for (let i = 1; i <= buildAttempts; i++) {
            const t = await getTournament(sdk!, pda);
            if (t.seedRevealed) return; // cron or a prior attempt already revealed
            try {
                revealIx = await buildRevealKitInstruction(
                    connection,
                    randomnessAccount,
                    payer,
                );
                break;
            } catch {
                if (i === buildAttempts) {
                    throw new Error(
                        "Switchboard oracle hasn't posted the randomness yet — click Start again in a few seconds.",
                    );
                }
                setStartStage(`Waiting for verifiable randomness… (${i})`);
                await new Promise((r) => setTimeout(r, 4000));
            }
        }
        if (!revealIx) return;
        setStartStage("Revealing the seed (sign in wallet)…");
        await revealSeed(sdk!, {
            tournamentPda: pda,
            randomnessAccount: address(randomnessAccount),
            preInstructions: [revealIx],
        });
    }

    async function handleStart() {
        if (!sdk) return;
        setStarting(true);
        setStartStage(null);
        try {
            const pda = address(tournament.id);

            // Authoritative chain read: non-OrganizerOnly tournaments MUST be
            // VRF-seeded (the program forbids the slot-hash fallback), and start
            // is gated on `seed_revealed`. Run the seeding ceremony first if
            // needed.
            const chain = await getTournament(sdk, pda);
            const needsVrf = chain.settlementMode !== SettlementMode.OrganizerOnly;

            if (needsVrf && !chain.seedRevealed) {
                if (!publicKey || !signTransaction) {
                    toast.error("Connect a wallet that can sign to seed the bracket.");
                    return;
                }
                const DEFAULT_PUBKEY = "11111111111111111111111111111111";
                // Bind a committed randomness account if one isn't already.
                let randomnessAccount = String(chain.vrfRandomnessAccount);
                if (randomnessAccount === DEFAULT_PUBKEY) {
                    const created = await commitRandomness({
                        connection,
                        walletPublicKey: publicKey,
                        signTransaction,
                        onStage: (s) =>
                            setStartStage(
                                s === "create-randomness"
                                    ? "Creating randomness (sign in wallet)…"
                                    : "Committing randomness (sign in wallet)…",
                            ),
                    });
                    randomnessAccount = created.randomnessAccount;
                    setStartStage("Binding randomness (sign in wallet)…");
                    await requestSeed(sdk, {
                        tournamentPda: pda,
                        randomnessAccount: address(randomnessAccount),
                    });
                }
                // Reveal in the organizer's own tx — no keeper/indexer dependency.
                await revealSeedAsOrganizer(pda, randomnessAccount, publicKey.toBase58());
            }

            setStartStage("Starting tournament…");
            await startTournament(sdk, { tournamentPda: pda });
            toast.success("Tournament started! Bracket is being initialized.");
            onStartSuccess();
        } catch (err) {
            const error = err as Error;
            if (error.message?.toLowerCase().includes("rejected")) {
                toast.info("Request cancelled");
            } else {
                const sdkErr = mapError(err);
                toast.error(sdkErr.message);
            }
            console.error("Start failed:", err);
        } finally {
            setStarting(false);
            setStartStage(null);
        }
    }

    if (tournament.status === "cancelled") return null;

    if (tournament.status === "completed") {
        return (
            <Button variant="outline" size="lg" className="w-full" onClick={onViewPayouts}>
                View Payouts →
            </Button>
        );
    }

    if (isOrganizer) {
        if (tournament.status === "registration") {
            const isFull = tournament.participants.length >= tournament.maxParticipants;
            const canStart = tournament.participants.length >= 2;
            const isDisabled = starting || !canStart;

            return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Button
                        onClick={handleStart}
                        disabled={isDisabled}
                        variant={isFull ? "primary" : "warning"}
                        size="lg"
                        className="w-full"
                    >
                        {starting
                            ? <><Loader2 className="animate-spin" /> {startStage ?? "Initializing…"}</>
                            : isFull ? "Start Tournament" : "Start Early (Lock Bracket)"
                        }
                    </Button>
                    {starting && startStage?.includes("verifiable randomness") && (
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "rgba(240,241,245,0.5)", lineHeight: 1.5, textAlign: "center" }}>
                            The bracket is seeded from Switchboard verifiable randomness. Waiting for the oracle to post the value (a few seconds), then one more signature to reveal it. Keep this open.
                        </p>
                    )}
                    <CancelDangerZone onCancel={onCancel} />
                </div>
            );
        }

        if (!tournament.bracketReady) {
            const pct = tournament.totalMatches > 0 ? Math.round((tournament.matchesInitialized / tournament.totalMatches) * 100) : 0;
            return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.2)", display: "flex", flexDirection: "column", gap: 8 }}>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: "#f5a623" }}>Bracket initializing</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "rgba(245,166,35,0.65)", lineHeight: 1.5 }}>
                            {tournament.matchesInitialized} / {tournament.totalMatches} matches written on-chain.
                        </p>
                        <div style={{ height: 3, background: "rgba(245,166,35,0.15)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "#f5a623", borderRadius: 999, transition: "width 0.5s ease" }} />
                        </div>
                    </div>
                    <Button
                        onClick={handleStart}
                        disabled={starting}
                        variant="warning"
                        size="lg"
                        className="w-full"
                    >
                        {starting ? <><Loader2 className="animate-spin" /> Continuing…</> : "Continue Bracket Init"}
                    </Button>
                    <CancelDangerZone onCancel={onCancel} />
                </div>
            );
        }

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(34,212,126,0.05)", border: "1px solid rgba(34,212,126,0.15)" }}>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: "#22d47e", marginBottom: 4 }}>Reporting results</p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "rgba(34,212,126,0.6)", lineHeight: 1.5 }}>
                        Click an <span style={{ fontWeight: 700 }}>active match</span> (glowing, pulsing) in the bracket to pick its winner. Final match auto-distributes the prize pool.
                    </p>
                </div>
                {/* Organizer is the referee in OrganizerOnly mode — jumping into
                    the game client to spectate the lobby is how they verify
                    results before reporting. No-op for `manual` tournaments. */}
                <LaunchGameButton game={tournament.gameKind} />
            </div>
        );
    }

    if (tournament.status !== "registration") {
        // Active tournament, joined player on a Steam game → one-click jump
        // into the game client (renders nothing for `manual` tournaments).
        // When their match has a committed lobby, the click also copies the
        // lobby id for the in-game Custom Lobbies search.
        if (tournament.status === "in_progress" && isParticipant) {
            return <LaunchGameButton game={tournament.gameKind} lobbyId={myLobbyId} iAmHost={iAmHost} />;
        }
        return null;
    }

    if (isParticipant) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Button
                    disabled
                    variant="primary"
                    size="lg"
                    className="w-full border border-accent/20 bg-accent/[0.07] text-accent shadow-none cursor-default"
                >
                    <CheckCircle2 />
                    Registered
                </Button>
                <LaunchGameButton game={tournament.gameKind} />
                {tournament.participants.length >= tournament.maxParticipants && (
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", textAlign: "center", color: "rgba(240,241,245,0.3)", fontStyle: "italic" }}>
                        Tournament is full! Waiting for organizer to start…
                    </p>
                )}
            </div>
        );
    }

    if (!currentAddress) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Button variant="primary" size="lg" className="w-full" onClick={login}>
                    <Wallet />
                    Sign in to Join
                </Button>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", textAlign: "center", color: "rgba(240,241,245,0.3)" }}>
                    {tournament.entryFee > 0
                        ? `Entry fee ${tournament.entryFee} ${tournament.token}. Sign in to register.`
                        : "Free entry. Sign in to register."}
                </p>
            </div>
        );
    }

    if (registrationClosed) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Button variant="primary" size="lg" className="w-full" disabled>
                    <Clock />
                    Registration Closed
                </Button>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", textAlign: "center", color: "rgba(240,241,245,0.3)", fontStyle: "italic" }}>
                    The deadline has passed. Waiting for organizer to start the bracket.
                </p>
            </div>
        );
    }

    const isFull = tournament.participants.length >= tournament.maxParticipants;
    const insufficient = !hasEnough && !!currentAddress && !joining && tournament.entryFee > 0;
    const joinDisabled = joining || insufficient || isFull;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {needsIdentity && (
                <div
                    ref={linkSteamRef}
                    style={{ padding: "10px 12px", background: "rgba(102,192,244,0.06)", border: "1px solid rgba(102,192,244,0.2)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}
                >
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "rgba(199,213,224,0.85)" }}>
                        This is a Steam-verified tournament. Link your Steam account before joining.
                    </span>
                    <LinkSteamButton />
                </div>
            )}
            {insufficient && (
                <div style={{ padding: "10px 12px", background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "rgba(245,166,35,0.7)" }}>
                    <span style={{ fontWeight: 700, color: "#f5a623" }}>Low balance:</span> Your wallet has {walletUsdc?.toFixed(2) ?? "0"} USDC.
                </div>
            )}
            <Button
                id="join-btn"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleJoin}
                disabled={joinDisabled}
            >
                {joining
                    ? <><Loader2 className="animate-spin" /> Awaiting wallet…</>
                    : isFull ? "Tournament Full"
                        : insufficient ? "Insufficient Balance"
                            : <>Join Tournament {tournament.entryFee > 0 ? `— ${tournament.entryFee} ${tournament.token}` : "— Free"}</>
                }
            </Button>
        </div>
    );
}

// ── Sidebar skeleton ──────────────────────────────────────────────────────────

export function SidebarSkeleton() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 20 }}>
            {[80, 140, 60].map((h, i) => (
                <div key={i} style={{ width: "100%", background: "rgba(255,255,255,0.04)", borderRadius: 12, animation: "pulse 1.5s ease-in-out infinite", height: h }} />
            ))}
        </div>
    );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export function TournamentSidebar({
    tournament,
    currentAddress,
    onJoinSuccess,
    onStartSuccess,
    onRefresh,
    onCancel,
}: {
    tournament: TournamentView;
    currentAddress: string | null;
    onJoinSuccess: () => void;
    onStartSuccess: () => void;
    onRefresh: () => void;
    onCancel: () => void;
}) {
    const isOrganizer = tournament.organizer.address === currentAddress;
    const [payoutsExpanded, setPayoutsExpanded] = useState(false);
    const payoutsRef = useRef<HTMLDivElement | null>(null);

    function handleViewPayouts() {
        setPayoutsExpanded(true);
        requestAnimationFrame(() => {
            payoutsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    }

    return (
        <aside
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                padding: 20,
                background: "rgba(13,15,24,0.85)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                height: "fit-content",
            }}
        >
            <ParticipantList participants={tournament.participants} currentAddress={currentAddress} maxParticipants={tournament.maxParticipants} />
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
            <EscrowPanel tournament={tournament} payoutsExpanded={payoutsExpanded} setPayoutsExpanded={setPayoutsExpanded} payoutsRef={payoutsRef} />
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
            <OrganizerPanel organizer={tournament.organizer} arbitrator={tournament.arbitrator} showArbitrator={tournament.settlementMode === "oracle"} />
            <ActionArea
                tournament={tournament}
                currentAddress={currentAddress}
                isOrganizer={isOrganizer}
                onJoinSuccess={onJoinSuccess}
                onStartSuccess={onStartSuccess}
                onRefresh={onRefresh}
                onViewPayouts={handleViewPayouts}
                onCancel={onCancel}
            />
        </aside>
    );
}
