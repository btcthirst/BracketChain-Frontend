"use client";

import { useEffect, useState } from "react";

interface Props {
    value: number;
    isInView: boolean;
}

export function AnimatedCounter({ value, isInView }: Props) {
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