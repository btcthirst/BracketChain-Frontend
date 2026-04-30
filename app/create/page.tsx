import { CreateTournament } from "@/features/tournament/create/CreateTournament";

export const metadata = {
    title: "Create Tournament — BracketChain",
    description: "Launch a trustless tournament on Solana in minutes.",
};

export default function CreatePage() {
    return <CreateTournament />;
}