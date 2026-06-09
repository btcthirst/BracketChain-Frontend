export function totalPool(deposit: string, fee: string, max: number): number {
    const d = parseFloat(deposit) || 0;
    // Empty / NaN / negative → 0 (free entry). Match microUsdcFromUsd semantics.
    const fParsed = parseFloat(fee);
    const f = Number.isFinite(fParsed) && fParsed > 0 ? fParsed : 0;
    return d + f * max;
}

export function inputCls(error?: string) {
    return `w-full px-4 py-3.5 rounded-lg border text-sm bg-input text-foreground placeholder:text-muted-foreground transition-colors outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 ${error ? "border-destructive/60" : "border-border hover:border-white/15"}`;
}