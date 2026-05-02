"use client";
import { useState, useEffect } from "react";

interface CountdownTimerProps {
    deadline: string;
    onEnd?: () => void;
}

export function CountdownTimer({ deadline, onEnd }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<string>("");

    useEffect(() => {
        const target = new Date(deadline).getTime();

        function update() {
            const now = Date.now();
            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft("Registration Closed");
                onEnd?.();
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            let str = "";
            if (days > 0) str += `${days}d `;
            if (hours > 0 || days > 0) str += `${hours}h `;
            str += `${minutes}m ${seconds}s`;
            setTimeLeft(str);
        }

        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [deadline, onEnd]);

    return <span>{timeLeft}</span>;
}
