import { address } from "@solana/kit";
import { BracketChainClient, getTournament } from "@bracketchain/sdk";

const RPC_URL = "https://api.devnet.solana.com";
const TOURNAMENT_PDA = "DRVqTngSGUsrmZQZvbw1xQ2fkxcx2hEq9uXt7pvu4yHg";

async function main() {
    const client = new BracketChainClient({ rpc: RPC_URL });

    try {
        const tournament = await getTournament(client, address(TOURNAMENT_PDA));
        console.log("Tournament Name:", tournament.name);
        console.log("Organizer:", tournament.organizer.toString());
        console.log("Max Participants:", tournament.maxParticipants);
        console.log("Current Status:", JSON.stringify(tournament.status));
    } catch (err) {
        console.error("Error fetching tournament:", err);
    }
}

main();
