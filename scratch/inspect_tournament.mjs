import { Connection, PublicKey } from "@solana/web3.js";
import { BracketChainClient, getTournament } from "@bracketchain/sdk";

const RPC_URL = "https://api.devnet.solana.com";
const TOURNAMENT_PDA = "DRVqTngSGUsrmZQZvbw1xQ2fkxcx2hEq9uXt7pvu4yHg";

async function main() {
    const connection = new Connection(RPC_URL, "confirmed");
    const client = new BracketChainClient({ connection });
    
    try {
        const tournament = await getTournament(client, new PublicKey(TOURNAMENT_PDA));
        console.log("Tournament Name:", tournament.name);
        console.log("Organizer:", tournament.organizer.toBase58());
        console.log("Max Participants:", tournament.maxParticipants);
        console.log("Current Status:", JSON.stringify(tournament.status));
    } catch (err) {
        console.error("Error fetching tournament:", err);
    }
}

main();
