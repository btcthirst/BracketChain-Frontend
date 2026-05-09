"use client";

import { useEffect, useReducer } from "react";
import { Info } from "lucide-react";

interface Props {
    name: string;
}

type State =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "exists" }
    | { status: "clear" };

type Action =
    | { type: "CHECK_START" }
    | { type: "CHECK_DONE"; exists: boolean }
    | { type: "RESET" };

function reducer(_: State, action: Action): State {
    switch (action.type) {
        case "RESET": return { status: "idle" };
        case "CHECK_START": return { status: "checking" };
        case "CHECK_DONE": return { status: action.exists ? "exists" : "clear" };
        default: return { status: "idle" };
    }
}

// TODO: replace with real API call:
// GET /api/tournaments/check-name?name=<name>
async function checkNameExists(name: string): Promise<boolean> {
    const knownNames = [
        "spring championship",
        "weekend warriors",
        "pro circuit finals",
        "rookie rumble",
    ];
    await new Promise(r => setTimeout(r, 400));
    return knownNames.includes(name.trim().toLowerCase());
}

export function DuplicateNameWarning({ name }: Props) {
    const [state, dispatch] = useReducer(reducer, { status: "idle" });

    useEffect(() => {
        if (name.trim().length < 3) {
            dispatch({ type: "RESET" });
            return;
        }

        const timer = setTimeout(async () => {
            dispatch({ type: "CHECK_START" });
            try {
                const exists = await checkNameExists(name);
                dispatch({ type: "CHECK_DONE", exists });
            } catch {
                dispatch({ type: "CHECK_DONE", exists: false });
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [name]);

    if (state.status === "checking") {
        return (
            <p style={{ fontSize: "0.72rem", color: "rgba(240,241,245,0.3)", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span
                    style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        border: "2px solid rgba(240,241,245,0.15)",
                        borderTopColor: "rgba(240,241,245,0.5)",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                    }}
                />
                Checking name availability…
            </p>
        );
    }

    if (state.status !== "exists") return null;

    return (
        <div
            style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginTop: 6,
                background: "rgba(34,212,126,0.06)",
                border: "1px solid rgba(34,212,126,0.18)",
                borderRadius: 8,
                padding: "8px 12px",
            }}
        >
            <Info size={14} style={{ color: "#22d47e", flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: "0.75rem", color: "rgba(240,241,245,0.5)", lineHeight: 1.55 }}>
                A tournament with this name already exists. Tournament names are not
                unique on-chain, but consider a different name to avoid confusion for
                participants.
            </p>
        </div>
    );
}
