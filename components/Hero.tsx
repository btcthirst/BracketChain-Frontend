import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MotionDiv, MotionPath } from "@/components/ui/motion-wraper";
import { ROUTES } from "@/constants/links";

export function Hero() {
    return (
        <section className="relative bg-[#0a1929] min-h-[60vh] flex items-center overflow-hidden">
            <div className="container mx-auto px-6 py-20">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <MotionDiv
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6">
                            Trustless tournaments.<br />Instant payouts.
                        </h1>
                        <p className="text-xl text-gray-300 mb-8">
                            Decentralized tournament infrastructure powered by Solana smart contracts.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link
                                href={ROUTES.create}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                            >
                                Create Tournament
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                href={ROUTES.explore}
                                className="border-2 border-white text-white hover:bg-white hover:text-[#0a1929] px-8 py-4 rounded-lg font-semibold transition-colors"
                            >
                                Explore Tournaments
                            </Link>
                        </div>
                    </MotionDiv>

                    <MotionDiv
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="hidden lg:block"
                    >
                        <BracketVisualization />
                    </MotionDiv>
                </div>
            </div>
        </section>
    );
}

function BracketVisualization() {
    return (
        <div className="relative w-full h-[400px] flex items-center justify-center">
            <svg viewBox="0 0 600 400" className="w-full h-full">
                <defs>
                    <linearGradient id="payoutGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                </defs>

                <rect x="50" y="80" width="100" height="40" rx="4" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
                <text x="100" y="105" textAnchor="middle" fill="white" fontSize="12">Player 1</text>
                <rect x="50" y="140" width="100" height="40" rx="4" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
                <text x="100" y="165" textAnchor="middle" fill="white" fontSize="12">Player 2</text>
                <rect x="50" y="220" width="100" height="40" rx="4" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
                <text x="100" y="245" textAnchor="middle" fill="white" fontSize="12">Player 3</text>
                <rect x="50" y="280" width="100" height="40" rx="4" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
                <text x="100" y="305" textAnchor="middle" fill="white" fontSize="12">Player 4</text>

                <path d="M 150 100 L 200 100 L 200 130 L 250 130" stroke="#3b82f6" strokeWidth="2" fill="none" />
                <path d="M 150 160 L 200 160 L 200 130 L 250 130" stroke="#3b82f6" strokeWidth="2" fill="none" />
                <path d="M 150 240 L 200 240 L 200 270 L 250 270" stroke="#3b82f6" strokeWidth="2" fill="none" />
                <path d="M 150 300 L 200 300 L 200 270 L 250 270" stroke="#3b82f6" strokeWidth="2" fill="none" />

                <rect x="250" y="110" width="100" height="40" rx="4" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
                <text x="300" y="135" textAnchor="middle" fill="white" fontSize="12">Player 1</text>
                <rect x="250" y="250" width="100" height="40" rx="4" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
                <text x="300" y="275" textAnchor="middle" fill="white" fontSize="12">Player 3</text>

                <path d="M 350 130 L 400 130 L 400 180 L 450 180" stroke="#3b82f6" strokeWidth="2" fill="none" />
                <path d="M 350 270 L 400 270 L 400 220 L 450 220" stroke="#3b82f6" strokeWidth="2" fill="none" />

                <rect x="450" y="180" width="100" height="40" rx="4" fill="#1e3a8a" stroke="#10b981" strokeWidth="3" />
                <text x="500" y="205" textAnchor="middle" fill="#10b981" fontSize="12" fontWeight="bold">Winner</text>

                <MotionPath
                    d="M 500 220 L 500 280"
                    stroke="url(#payoutGradient)"
                    strokeWidth="3"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, repeatDelay: 2 }}
                />
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                        <polygon points="0 0, 10 5, 0 10" fill="#10b981" />
                    </marker>
                </defs>

                <text x="500" y="310" textAnchor="middle" fill="#10b981" fontSize="14" fontWeight="bold">
                    💰 Instant Payout
                </text>
            </svg>
        </div>
    );
}