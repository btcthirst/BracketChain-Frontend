import { ExplorePage } from "@/features/explore/ExplorePage";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Explore Tournaments — BracketChain",
    description: "Discover and join active on-chain tournaments. Filter by game, prize pool, and format.",
};

export default function Page() {
    return <ExplorePage />;
}