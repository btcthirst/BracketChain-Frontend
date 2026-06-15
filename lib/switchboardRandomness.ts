import { address, AccountRole, type Instruction } from "@solana/kit";
import type { Connection, PublicKey, Transaction } from "@solana/web3.js";

import { switchboardQueue } from "./switchboardFeed";

export type RandomnessStage = "create-randomness" | "commit-randomness";

export interface CommitRandomnessOptions {
    connection: Connection;
    walletPublicKey: PublicKey;
    /** wallet-adapter `signTransaction` (legacy tx path). */
    signTransaction: (tx: Transaction) => Promise<Transaction>;
    onStage?: (stage: RandomnessStage) => void;
}

export interface CommitRandomnessResult {
    /** base58 address of the committed randomness account, for `requestSeed`. */
    randomnessAccount: string;
}

export async function commitRandomness(
    opts: CommitRandomnessOptions,
): Promise<CommitRandomnessResult> {
    const { connection, walletPublicKey, signTransaction, onStage } = opts;

    const [{ AnchorUtils, Randomness }, web3] = await Promise.all([
        import("@switchboard-xyz/on-demand"),
        import("@solana/web3.js"),
    ]);

    const anchorWallet = {
        publicKey: walletPublicKey,
        signTransaction,
        signAllTransactions: async (txs: Transaction[]): Promise<Transaction[]> => {
            const out: Transaction[] = [];
            for (const t of txs) out.push(await signTransaction(t));
            return out;
        },
    };
    const program = await AnchorUtils.loadProgramFromConnection(
        connection,
        anchorWallet as never,
    );
    const queue = new web3.PublicKey(switchboardQueue());

    // Build, sign (wallet + any extra signers), send, confirm one legacy tx.
    async function send(
        ixs: import("@solana/web3.js").TransactionInstruction[],
        extraSigners: import("@solana/web3.js").Keypair[],
    ): Promise<void> {
        const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash("confirmed");
        const tx = new web3.Transaction({
            feePayer: walletPublicKey,
            blockhash,
            lastValidBlockHeight,
        });
        for (const ix of ixs) tx.add(ix);
        if (extraSigners.length > 0) tx.partialSign(...extraSigners);
        const signed = await signTransaction(tx);
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(
            { signature, blockhash, lastValidBlockHeight },
            "confirmed",
        );
    }

    // 1. create — the randomness account is a fresh keypair that co-signs.
    onStage?.("create-randomness");
    const rngKp = web3.Keypair.generate();
    const [randomness, createIx] = await Randomness.create(program, rngKp, queue);
    await send([createIx], [rngKp]);

    // 2. commit — now that the account exists on-chain.
    onStage?.("commit-randomness");
    const commitIx = await randomness.commitIx(queue);
    await send([commitIx], []);

    return { randomnessAccount: randomness.pubkey.toBase58() };
}

export async function buildRevealKitInstruction(
    connection: Connection,
    randomnessAccount: string,
    payer: string,
): Promise<Instruction> {
    const [{ AnchorUtils, Randomness }, web3] = await Promise.all([
        import("@switchboard-xyz/on-demand"),
        import("@solana/web3.js"),
    ]);
    const program = await AnchorUtils.loadProgramFromConnection(connection);
    const randomness = new Randomness(
        program,
        new web3.PublicKey(randomnessAccount),
    );
    const ix = await randomness.revealIx(new web3.PublicKey(payer));
    // web3.js TransactionInstruction → kit Instruction (same mapping as the
    // indexer's web3-kit.ts `toKitInstruction`).
    return {
        programAddress: address(ix.programId.toBase58()),
        accounts: ix.keys.map((k) => ({
            address: address(k.pubkey.toBase58()),
            role:
                k.isSigner && k.isWritable
                    ? AccountRole.WRITABLE_SIGNER
                    : k.isSigner
                      ? AccountRole.READONLY_SIGNER
                      : k.isWritable
                        ? AccountRole.WRITABLE
                        : AccountRole.READONLY,
        })),
        data: new Uint8Array(ix.data),
    };
}
