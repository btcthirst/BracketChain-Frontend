"use client";

import { useEffect, useReducer } from "react";

/**
 * Debounced availability check for a tournament name, scoped to the organizer.
 *
 * The on-chain Tournament PDA derives from `[b"tournament", organizer, name]`,
 * so a name is unique *per organizer* — the same wallet creating two
 * tournaments with the same name hits an `init` collision and the create fails.
 * This hook is an advisory pre-check against the indexer's
 * `GET /tournaments/check-name?organizer=&name=` endpoint; the on-chain create
 * remains the source of truth, so any error degrades to "clear" (never blocks).
 *
 * No-ops (returns `idle`) when the indexer URL is unset, no wallet is connected,
 * or the name is shorter than 3 chars.
 */
type State = { status: "idle" | "checking" | "taken" | "clear" };

type Action =
  | { type: "START" }
  | { type: "DONE"; taken: boolean }
  | { type: "RESET" };

function reducer(_: State, action: Action): State {
  switch (action.type) {
    case "START":
      return { status: "checking" };
    case "DONE":
      return { status: action.taken ? "taken" : "clear" };
    default:
      return { status: "idle" };
  }
}

export function useNameCheck(name: string, organizer: string | null): State {
  const [state, dispatch] = useReducer(reducer, { status: "idle" });

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_INDEXER_URL;
    const trimmed = name.trim();
    if (!baseUrl || !organizer || trimmed.length < 3) {
      dispatch({ type: "RESET" });
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      dispatch({ type: "START" });
      const url =
        `${baseUrl.replace(/\/$/, "")}/tournaments/check-name` +
        `?organizer=${encodeURIComponent(organizer)}&name=${encodeURIComponent(trimmed)}`;
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`check-name ${res.status}`);
          return res.json() as Promise<{ taken?: boolean }>;
        })
        .then((json) => {
          if (active) dispatch({ type: "DONE", taken: Boolean(json.taken) });
        })
        .catch(() => {
          // Advisory only — don't block creation on a check failure.
          if (active) dispatch({ type: "DONE", taken: false });
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [name, organizer]);

  return state;
}
