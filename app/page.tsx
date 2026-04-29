import { Navbar } from "components/Navbar";
import { Hero } from "components/Hero";
import { StatsBar } from "components/StatsBar";
import { HowItWorks } from "components/HowItWorks";
import { LiveTournaments } from "components/LiveTournaments";
import { ForDevelopers } from "components/ForDevelopers";
import { Footer } from "components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <StatsBar />
      <HowItWorks />
      <LiveTournaments />
      <ForDevelopers />
      <Footer />
    </div>
  );
}
