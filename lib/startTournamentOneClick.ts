import {
    type BracketChainClient,
    buildStartTournamentTransactions,
    startTournament,
    type StartTournamentResult,
} from "@bracketchain/sdk";
import { type Address, getBase58Decoder } from "@solana/kit";
import { useSignAndSendTransaction } from "@privy-io/react-auth/solana";
import { useConnection } from "@solana/wallet-adapter-react";
import { VersionedMessage, VersionedTransaction } from "@solana/web3.js";
import type { Connection } from "@solana/web3.js";

import { useActiveWallet } from "@/hooks/useActiveWallet";

/** Privy chain id for the configured cluster (external wallets ignore it). */
function solanaChainFromEnv(): "solana:mainnet" | "solana:devnet" {
    return process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
        ? "solana:mainnet"
        : "solana:devnet";
}

/** Serialize a Kit-compiled (unsigned) transaction to the wire bytes Privy wants. */
function serializeKitTransaction(messageBytes: Uint8Array): Uint8Array {
    const compiled = VersionedMessage.deserialize(messageBytes);
    return new VersionedTransaction(compiled).serialize();
}

/** Poll until every signature is confirmed (or throw on error / timeout). */
async function confirmSignatures(
    connection: Connection,
    signatures: string[],
    timeoutMs = 45_000,
): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    const pending = new Set(signatures);
    while (pending.size > 0) {
        const statuses = await connection.getSignatureStatuses([...pending]);
        [...pending].forEach((sig, i) => {
            const st = statuses.value[i];
            if (st?.err) {
                throw new Error(`Transaction ${sig} failed: ${JSON.stringify(st.err)}`);
            }
            if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) {
                pending.delete(sig);
            }
        });
        if (pending.size === 0) return;
        if (Date.now() > deadline) {
            throw new Error("Timed out confirming bracket-init transactions");
        }
        await new Promise((r) => setTimeout(r, 1_000));
    }
}

/**
 * Start a tournament (initialize the bracket) in a SINGLE wallet approval.
 *
 * Builds the bracket-init chunks via the SDK, then batch-signs+sends them all
 * through Privy's variadic `signAndSendTransaction(...inputs)` — one prompt for
 * the whole bracket. The on-chain handler validates each chunk standalone and
 * idempotently, so the chunks may land in any order.
 *
 * Falls back to the SDK's sequential `startTournament` loop (one prompt per
 * chunk) when the wallet can't honor a batched send — and because the on-chain
 * init is idempotent, the fallback safely resumes from a partial batch.
 */
export function useStartTournamentOneClick() {
    const { signAndSendTransaction } = useSignAndSendTransaction();
    const { wallet } = useActiveWallet();
    const { connection } = useConnection();

    return async function startTournamentOneClick(
        client: BracketChainClient,
        tournamentPda: Address,
    ): Promise<StartTournamentResult> {
        if (!wallet) {
            // No standard wallet to batch with — use the SDK signer path.
            return startTournament(client, { tournamentPda });
        }

        const built = await buildStartTournamentTransactions(client, { tournamentPda });

        // Nothing left to do (idempotent resume found the bracket fully built).
        if (built.transactions.length === 0) {
            return {
                txSignatures: [],
                bracketSize: built.bracketSize,
                totalMatches: built.totalMatches,
            };
        }

        const chain = solanaChainFromEnv();
        const inputs = built.transactions.map((tx) => ({
            transaction: serializeKitTransaction(tx.messageBytes as unknown as Uint8Array),
            wallet,
            chain,
        }));

        try {
            const outputs = await signAndSendTransaction(...inputs);
            if (!Array.isArray(outputs) || outputs.length !== inputs.length) {
                // Wallet fanned the batch out or returned an unexpected shape —
                // resume idempotently through the sequential path.
                return startTournament(client, { tournamentPda });
            }
            const decoder = getBase58Decoder();
            const signatures = outputs.map((o) => decoder.decode(o.signature));
            await confirmSignatures(connection, signatures);
            return {
                txSignatures: signatures as StartTournamentResult["txSignatures"],
                bracketSize: built.bracketSize,
                totalMatches: built.totalMatches,
            };
        } catch (err) {
            // User-cancelled batches should NOT silently re-prompt N times.
            const msg = (err as Error)?.message?.toLowerCase() ?? "";
            if (msg.includes("reject") || msg.includes("denied") || msg.includes("cancel")) {
                throw err;
            }
            // Otherwise the wallet likely can't batch-send — fall back to the
            // sequential loop, which resumes from whatever already landed.
            return startTournament(client, { tournamentPda });
        }
    };
}
