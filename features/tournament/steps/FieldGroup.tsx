export function FieldGroup({ label, hint, children, error }: { label: string; hint?: string; children: React.ReactNode; error?: string }) {
    return (
        <div className="flex flex-col gap-1.5" >
            <label className="text-sm font-semibold text-gray-800" > {label} </label>
            {children}
            {hint && !error && <p className="text-xs text-gray-500 leading-relaxed" > {hint} </p>}
            {error && <p className="text-xs text-red-500" > {error} </p>}
        </div>
    );
}