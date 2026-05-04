import { PlayerProfilePage } from "@/features/player/PlayerProfilePage";
import type { Metadata } from "next";

interface Props {
    params: Promise<{ wallet: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { wallet } = await params;
    const truncated = `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
    
    return {
        title: `Player Profile ${truncated} — BracketChain`,
        description: `View tournament history, win rate, and earnings for player ${wallet} on BracketChain.`,
    };
}

export default async function Page({ params }: Props) {
    const { wallet } = await params;
    return <PlayerProfilePage wallet={wallet} />;
}
