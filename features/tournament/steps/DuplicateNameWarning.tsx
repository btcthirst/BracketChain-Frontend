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
        // dispatch is stable — no lint warning
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
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                Checking name availability…
            </p>
        );
    }

    if (state.status !== "exists") return null;

    return (
        <div className="flex items-start gap-2 mt-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
                A tournament with this name already exists. Tournament names are not
                unique on-chain, but consider a different name to avoid confusion for
                participants.
            </p>
        </div>
    );
}