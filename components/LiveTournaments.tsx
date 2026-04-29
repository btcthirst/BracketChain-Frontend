import { Users, Clock, Trophy } from "lucide-react";
import { MotionDiv } from "@/components/ui/motion-wraper"

interface Tournament {
    id: string;
    name: string;
    game: string;
    format: "SE" | "DE" | "Swiss" | "RR";
    prizePool: number;
    participants: number;
    maxParticipants: number;
    startsIn: string;
}

const mockTournaments: Tournament[] = [
    {
        id: "1",
        name: "Spring Championship",
        game: "Valorant",
        format: "SE",
        prizePool: 5000,
        participants: 28,
        maxParticipants: 32,
        startsIn: "2h 15m",
    },
    {
        id: "2",
        name: "Weekend Warriors",
        game: "League of Legends",
        format: "DE",
        prizePool: 2500,
        participants: 12,
        maxParticipants: 16,
        startsIn: "45m",
    },
    {
        id: "3",
        name: "Pro Circuit Finals",
        game: "CS2",
        format: "Swiss",
        prizePool: 10000,
        participants: 16,
        maxParticipants: 16,
        startsIn: "Starting soon",
    },
    {
        id: "4",
        name: "Rookie Rumble",
        game: "Rocket League",
        format: "RR",
        prizePool: 1000,
        participants: 6,
        maxParticipants: 8,
        startsIn: "4h 30m",
    },
];

const formatLabels = {
    SE: "Single Elimination",
    DE: "Double Elimination",
    Swiss: "Swiss System",
    RR: "Round Robin",
};

export function LiveTournaments() {
    return (
        <section className="bg-gray-50 py-20">
            <div className="container mx-auto px-6">
                <MotionDiv
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Live Tournaments</h2>
                    <p className="text-xl text-gray-600">Join the action now</p>
                </MotionDiv>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {mockTournaments.map((tournament, index) => (
                        <MotionDiv
                            key={tournament.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow cursor-pointer border border-gray-200"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{tournament.name}</h3>
                                    <p className="text-gray-600">{tournament.game}</p>
                                </div>
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                                    {tournament.format}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    <div>
                                        <div className="text-sm text-gray-500">Prize Pool</div>
                                        <div className="font-bold text-gray-900">${tournament.prizePool.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-500" />
                                    <div>
                                        <div className="text-sm text-gray-500">Players</div>
                                        <div className="font-bold text-gray-900">
                                            {tournament.participants}/{tournament.maxParticipants}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-green-500" />
                                    <div>
                                        <div className="text-sm text-gray-500">Starts In</div>
                                        <div className="font-bold text-gray-900">{tournament.startsIn}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 transition-all"
                                    style={{ width: `${(tournament.participants / tournament.maxParticipants) * 100}%` }}
                                />
                            </div>
                        </MotionDiv>
                    ))}
                </div>

                <div className="text-center">
                    <button className="text-blue-600 hover:text-blue-700 font-semibold text-lg hover:underline">
                        View All Tournaments →
                    </button>
                </div>
            </div>
        </section>
    );
}
