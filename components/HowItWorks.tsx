import { Trophy, Gamepad2, Wallet } from "lucide-react";
import { MotionDiv } from "@/components/ui/motion-wraper";

const steps = [
    {
        number: "01",
        icon: Trophy,
        title: "Create",
        description: "Set up your tournament with custom rules, prize pools, and entry fees in minutes.",
    },
    {
        number: "02",
        icon: Gamepad2,
        title: "Compete",
        description: "Players join, compete, and results are automatically verified on-chain.",
    },
    {
        number: "03",
        icon: Wallet,
        title: "Get Paid",
        description: "Winners receive instant payouts directly to their wallet. No intermediaries.",
    },
];

export function HowItWorks() {
    return (
        <section style={{ background: "transparent", padding: "96px 0" }}>
            <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
                <MotionDiv
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    style={{ marginBottom: 64 }}
                >
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "4px 12px",
                            background: "rgba(34,212,126,0.08)",
                            border: "1px solid rgba(34,212,126,0.18)",
                            borderRadius: 999,
                            marginBottom: 20,
                        }}
                    >
                        <span
                            style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "0.68rem",
                                color: "rgba(240,241,245,0.5)",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                            }}
                        >
                            Simple by design
                        </span>
                    </div>
                    <h2
                        style={{
                            fontFamily: "'Syne', sans-serif",
                            fontWeight: 700,
                            fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                            color: "#f0f1f5",
                            letterSpacing: "-0.03em",
                            lineHeight: 1.1,
                            marginBottom: 16,
                        }}
                    >
                        How It Works
                    </h2>
                    <p style={{ fontSize: "0.95rem", color: "rgba(240,241,245,0.42)", maxWidth: 480 }}>
                        Three simple steps to trustless tournaments
                    </p>
                </MotionDiv>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 20,
                    }}
                    className="grid-cols-1 md:grid-cols-3"
                >
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <MotionDiv
                                key={step.title}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.12 }}
                            >
                                <div
                                    style={{
                                        background: "rgba(13,15,24,0.8)",
                                        border: "1px solid rgba(255,255,255,0.07)",
                                        borderRadius: 12,
                                        padding: 28,
                                        height: "100%",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: 20,
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 10,
                                                background: "rgba(34,212,126,0.08)",
                                                border: "1px solid rgba(34,212,126,0.16)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Icon size={20} style={{ color: "#22d47e" }} />
                                        </div>
                                        <span
                                            style={{
                                                fontFamily: "'DM Mono', monospace",
                                                fontSize: "0.68rem",
                                                color: "rgba(240,241,245,0.15)",
                                                letterSpacing: "0.06em",
                                            }}
                                        >
                                            {step.number}
                                        </span>
                                    </div>
                                    <h3
                                        style={{
                                            fontFamily: "'Syne', sans-serif",
                                            fontWeight: 700,
                                            fontSize: "1rem",
                                            color: "#f0f1f5",
                                            letterSpacing: "-0.01em",
                                            marginBottom: 10,
                                        }}
                                    >
                                        {step.title}
                                    </h3>
                                    <p
                                        style={{
                                            fontSize: "0.875rem",
                                            color: "rgba(240,241,245,0.4)",
                                            lineHeight: 1.65,
                                        }}
                                    >
                                        {step.description}
                                    </p>
                                </div>
                            </MotionDiv>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
