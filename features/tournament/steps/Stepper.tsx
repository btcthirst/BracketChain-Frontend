import { CheckCircle2 } from "lucide-react";

export function Stepper({ current }: { current: number }) {
    const steps = ["Details", "Prize Pool", "Confirm"];
    return (
        <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
            {steps.map((label, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <div key={i} style={{ display: "flex", alignItems: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    border: "2px solid",
                                    transition: "all 0.3s",
                                    ...(done
                                        ? { background: "#22d47e", borderColor: "#22d47e", color: "#06070b" }
                                        : active
                                        ? { background: "transparent", borderColor: "#22d47e", color: "#22d47e" }
                                        : { background: "transparent", borderColor: "rgba(255,255,255,0.12)", color: "rgba(240,241,245,0.25)" }),
                                }}
                            >
                                {done ? <CheckCircle2 size={16} /> : i + 1}
                            </div>
                            <span
                                style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "0.68rem",
                                    letterSpacing: "0.04em",
                                    ...(active
                                        ? { color: "#22d47e" }
                                        : done
                                        ? { color: "rgba(240,241,245,0.6)" }
                                        : { color: "rgba(240,241,245,0.25)" }),
                                }}
                            >
                                {label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div
                                style={{
                                    height: 1,
                                    width: 64,
                                    margin: "0 8px",
                                    marginBottom: 20,
                                    background: done ? "#22d47e" : "rgba(255,255,255,0.08)",
                                    transition: "background 0.5s",
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
