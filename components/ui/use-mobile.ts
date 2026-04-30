import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;

function subscribe(callback: () => void) {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

function getServerSnapshot() {
    return false; // або значення за замовчуванням
}

export function useIsMobile() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}