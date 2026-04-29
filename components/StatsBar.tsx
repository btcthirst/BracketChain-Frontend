"use client";

import { motion, useInView } from "motion/react";
import { useRef, useEffect, useState } from "react";

interface Stat {
    label: string;
    value: number;
    prefix?: string;
    suffix?: string;
}

const stats: Stat[] = [
    { label: "Tournaments Created", value: 1247 },
    { label: "Total Prize Volume", value: 892500, prefix: "$" },
    { label: "Games Integrated", value: 12 },
    { label: "Avg Payout Time", value: 8, suffix: "s" },
];

export function StatsBar() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.5 });

    return (
        <section ref={ref} className="bg-gray-100 py-12">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="text-center"
                        >
                            <div className="text-4xl font-bold text-gray-900 mb-2">
                                {stat.prefix}
                                <AnimatedCounter value={stat.value} isInView={isInView} />
                                {stat.suffix}
                            </div>
                            <div className="text-gray-600 font-medium">{stat.label}</div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function AnimatedCounter({ value, isInView }: { value: number; isInView: boolean }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!isInView) return;

        const duration = 2000;
        const steps = 60;
        const increment = value / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
                setCount(value);
                clearInterval(timer);
            } else {
                setCount(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [value, isInView]);

    return <span>{count.toLocaleString()}</span>;
}
