import { Trophy, Gamepad2, Wallet } from "lucide-react";
import { MotionDiv } from "@/components/ui/motion-wraper";

const steps = [
    {
        icon: Trophy,
        title: "Create",
        description: "Set up your tournament with custom rules, prize pools, and entry fees in minutes.",
    },
    {
        icon: Gamepad2,
        title: "Compete",
        description: "Players join, compete, and results are automatically verified on-chain.",
    },
    {
        icon: Wallet,
        title: "Get Paid",
        description: "Winners receive instant payouts directly to their wallet. No intermediaries.",
    },
];

export function HowItWorks() {
    return (
        <section className="bg-white py-20">
            <div className="container mx-auto px-6">
                <MotionDiv
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
                    <p className="text-xl text-gray-600">Three simple steps to trustless tournaments</p>
                </MotionDiv>

                <div className="grid md:grid-cols-3 gap-8">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <MotionDiv
                                key={step.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.2 }}
                                className="text-center"
                            >
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-6">
                                    <Icon className="w-10 h-10 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">{step.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{step.description}</p>
                            </MotionDiv>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
