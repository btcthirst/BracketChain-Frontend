import { PlayerProfilePage } from "@/features/player/PlayerProfilePage";

interface Props {
    params: Promise<{ wallet: string }>;
}

export async function generateMetadata({ params }: Props) {
    const { wallet } = await params;
    return {
        title: `Player ${wallet.slice(0, 4)}…${wallet.slice(-4)} — BracketChain`,
        description: `Tournament history, win/loss record, and earnings for ${wallet}.`,
    };
}

export default async function Page({ params }: Props) {
    const { wallet } = await params;
    return <PlayerProfilePage wallet={wallet} />;
}
