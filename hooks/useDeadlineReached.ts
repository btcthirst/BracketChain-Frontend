import { useEffect, useState } from "react";

// Returns `true` once `deadline` is in the past, and auto-flips on the same
// render cycle as the deadline ticks past — without polling. Multiple call
// sites (TournamentHeader badge, TournamentSidebar Join button, BracketEmpty
// CTA) need to agree on "is registration closed?" the moment the clock hits
// the deadline; using a single setTimeout keyed off `deadline` keeps them in
// sync without an interval.
//
// Implementation notes:
// - Initial value is computed in the `useState` initializer (allowed to read
//   `Date.now()` — initializers run once, not on every render).
// - The effect schedules a setTimeout to flip `reached` at the deadline. For
//   the rare case where `deadline` mutates from future to past mid-life, we
//   still go through `setTimeout(..., 0)` rather than calling `setReached`
//   synchronously — synchronous setState in an effect triggers React's
//   cascading-render warning.
export function useDeadlineReached(deadline: string | number | Date): boolean {
    const ms =
        typeof deadline === "number"
            ? deadline
            : typeof deadline === "string"
                ? new Date(deadline).getTime()
                : deadline.getTime();

    const [reached, setReached] = useState(
        () => !Number.isNaN(ms) && Date.now() >= ms,
    );

    useEffect(() => {
        if (reached) return;
        if (Number.isNaN(ms)) return;
        const remaining = ms - Date.now();
        const delay = remaining > 0 ? remaining + 1000 : 0;
        const t = setTimeout(() => setReached(true), delay);
        return () => clearTimeout(t);
    }, [ms, reached]);

    return reached;
}
