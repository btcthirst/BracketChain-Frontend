"use client";

import { useState } from "react";
import { Check, CircleDashed, Loader2, Radio, TriangleAlert } from "lucide-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useSignTransaction } from "@privy-io/react-auth/solana";
import { PublicKey, Transaction } from "@solana/web3.js";
import { address } from "@solana/kit";
import { bindMatchFeed } from "@bracketchain/sdk";
import { toast } from "sonner";

import { useBracketChainClient } from "@/lib/sdk";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import {
    computeFeedHashForGame,
    createPullFeed,
    feedGameFromKind,
    feedParamsForGame,
    fetchIdentityHash,
    switchboardQueue,
    type BindStage,
} from "@/lib/switchboardFeed";
import { handleTxError } from "@/lib/txErrors";
import { Button } from "@/components/ui/button";
import type { Match, TournamentView } from "@/types/tournament";

// ── Progress model ────────────────────────────────────────────────────────────

type FlowStep = "identities" | BindStage | "bind";

const STEP_ORDER: FlowStep[] = ["identities", "store", "create", "confirm", "bind"];

const STEP_LABELS: Record<FlowStep, string> = {
    identities: "Resolve player identities",
    store: "Store oracle job on Crossbar",
    create: "Create Switchboard feed (sign in wallet)",
    confirm: "Confirm feed creation",
    bind: "Bind feed to match (sign in wallet)",
};

const stepRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.78rem",
};

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
    tournament: TournamentView;
    match: Match;
    /** Hex lobby id already committed on-chain (Step 1 of the ceremony). */
    lobbyHex: string;
    /** Called after a successful bind tx so the parent refreshes. */
    onBound: () => void;
}

/**
 * Phase 1.5 — one-click feed bind. Replaces the manual "paste a feed address"
 * input: a single button drives the whole chain ① resolve both players'
 * identity hashes ② store the OracleJob on Crossbar ③ create the PullFeed
 * with `feed_hash = computeDotaFeedHash(queue, params)` (the SAME builder the
 * commit used) ④ `bind_match_feed`. Each stage is shown as a checklist row;
 * a failure freezes the row with an error mark and offers retry — already-
 * completed work (a created feed) is keyed by `feedAddress` state so retry
 * resumes at the bind step instead of paying for a second feed.
 *
 * Two wallet stacks meet here deliberately: feed creation runs on web3.js v1
 * (Switchboard's stack, via useConnection + signTransaction) while
 * `bind_match_feed` goes through the Kit client — see lib/switchboardFeed.ts.
 */
export function BindFeedFlow({ tournament, match, lobbyHex, onBound }: Props) {
    const sdk = useBracketChainClient();
    const { connection } = useConnection();
    const { wallet, address: walletAddress } = useActiveWallet();
    const { signTransaction: privySignTransaction } = useSignTransaction();

    // Adapt Privy's signer to the legacy web3.js `(tx) => Promise<Transaction>`
    // shape Switchboard's stack expects (lib/switchboardFeed.ts). Preserves the
    // feed keypair's partial signature via requireAllSignatures:false.
    const signLegacyTransaction = async (tx: Transaction): Promise<Transaction> => {
        if (!wallet) throw new Error("No connected wallet");
        const { signedTransaction } = await privySignTransaction({
            transaction: tx.serialize({ requireAllSignatures: false }),
            wallet,
            chain:
                process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
                    ? "solana:mainnet"
                    : "solana:devnet",
        });
        return Transaction.from(signedTransaction);
    };

    const [running, setRunning] = useState(false);
    const [step, setStep] = useState<FlowStep | null>(null);
    const [failedStep, setFailedStep] = useState<FlowStep | null>(null);
    // A feed created on a previous attempt — retry resumes at bind.
    const [feedAddress, setFeedAddress] = useState<string | null>(null);

    const onChainRound = match.round - 1;
    const game = feedGameFromKind(tournament.gameKind);

    async function run() {
        if (!sdk || !wallet || !walletAddress) {
            toast.error("Connect your wallet to continue");
            return;
        }
        if (!match.playerA || !match.playerB) {
            toast.error("Match has no players assigned yet");
            return;
        }
        setRunning(true);
        setFailedStep(null);
        let current: FlowStep = "identities";
        try {
            let feed = feedAddress;
            if (!feed) {
                // ① identity hashes — same inputs the commit hashed.
                setStep(current);
                const [aHash, bHash] = await Promise.all([
                    fetchIdentityHash(match.playerA.address, game),
                    fetchIdentityHash(match.playerB.address, game),
                ]);
                if (!aHash || !bHash) {
                    throw new Error(
                        "Both players must have linked Steam — identity hash not found on the indexer.",
                    );
                }

                const params = feedParamsForGame(game, lobbyHex, aHash, bHash);
                const expectedFeedHash = computeFeedHashForGame(
                    game,
                    switchboardQueue(),
                    params,
                );

                // ②–③ Crossbar store + feed creation (web3.js v1 lane).
                const created = await createPullFeed({
                    connection,
                    walletPublicKey: new PublicKey(walletAddress),
                    game,
                    signTransaction: signLegacyTransaction,
                    feedParams: params,
                    expectedFeedHash,
                    name: `BracketChain ${lobbyHex.slice(0, 8)}`,
                    onStage: (s) => {
                        current = s;
                        setStep(s);
                    },
                });
                feed = created.feedAddress;
                setFeedAddress(feed);
            }

            // ④ bind on the BracketChain program (Kit lane). The program
            // verifies feed_hash == expected_feed_hash — a mismatch here means
            // builder drift (R-2), not a transient failure.
            current = "bind";
            setStep(current);
            await bindMatchFeed(sdk, {
                tournamentPda: address(tournament.id),
                round: onChainRound,
                matchIndex: match.position,
                switchboardFeed: address(feed),
            });

            toast.success(
                "Feed bound — the oracle relayer will propose the winner once the match resolves.",
            );
            setStep(null);
            onBound();
        } catch (err) {
            setFailedStep(current);
            const text = (err as Error)?.message ?? "";
            if (text.toLowerCase().includes("rejected")) {
                toast.info("Request cancelled");
            } else if (current === "bind") {
                handleTxError(err, "bind_match_feed");
            } else {
                toast.error(text || "Feed creation failed");
            }
        } finally {
            setRunning(false);
        }
    }

    function stepIcon(s: FlowStep): React.ReactNode {
        if (failedStep === s)
            return <TriangleAlert style={{ width: 14, height: 14, color: "#f0b429" }} />;
        if (step === s && running)
            return <Loader2 className="animate-spin" style={{ width: 14, height: 14, color: "#22d47e" }} />;
        const done =
            (running || failedStep !== null || feedAddress !== null) &&
            STEP_ORDER.indexOf(s) < STEP_ORDER.indexOf(failedStep ?? step ?? "identities");
        if (done || (feedAddress !== null && s !== "bind"))
            return <Check style={{ width: 14, height: 14, color: "#22d47e" }} />;
        return <CircleDashed style={{ width: 14, height: 14, color: "rgba(240,241,245,0.35)" }} />;
    }

    const showChecklist = running || failedStep !== null || feedAddress !== null;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {showChecklist && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}>
                    {STEP_ORDER.map((s) => (
                        <div key={s} style={{ ...stepRow, color: failedStep === s ? "#f0b429" : step === s ? "#22d47e" : "rgba(240,241,245,0.6)" }}>
                            {stepIcon(s)}
                            {STEP_LABELS[s]}
                        </div>
                    ))}
                </div>
            )}
            {feedAddress && (
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "rgba(240,241,245,0.55)", wordBreak: "break-all" }}>
                    feed: {feedAddress}
                </p>
            )}
            <Button onClick={run} disabled={running || !sdk}>
                {running ? (
                    <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" />
                ) : (
                    <Radio style={{ width: 14, height: 14, marginRight: 6 }} />
                )}
                {failedStep ? "Retry" : feedAddress ? "Bind feed" : "Create & bind feed"}
            </Button>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.76rem", color: "rgba(240,241,245,0.55)", lineHeight: 1.5 }}>
                One click: stores the oracle job, creates a Switchboard feed whose
                hash matches the committed <code>expected_feed_hash</code>, and binds
                it to this match. Two wallet signatures.
            </p>
        </div>
    );
}
