import { TournamentPage } from "@/features/tournament/view/TournamentPage";

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
    const { id } = await params;
    return {
        title: `Tournament — BracketChain`,
        description: `View bracket, participants, and prize pool for tournament ${id}.`,
    };
}

export default async function Page({ params }: Props) {
    const { id } = await params;
    return <TournamentPage id={id} />;
}