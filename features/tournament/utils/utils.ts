export function totalPool(deposit: string, fee: string, max: number, freeEntry: boolean): number {
    const d = parseFloat(deposit) || 0;
    const f = freeEntry ? 0 : (parseFloat(fee) || 0);
    return d + f * max;
}

export function inputCls(error?: string) {
    return `w-full px-3 py-2.5 rounded-lg border text-sm bg-white text-gray-900 transition-colors outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 ${error ? "border-red-400" : "border-gray-300 hover:border-gray-400"}`;
}