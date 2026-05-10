export function FieldGroup({ label, hint, children, error }: { label: string; hint?: string; children: React.ReactNode; error?: string }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label
                style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.68rem",
                    fontWeight: 500,
                    color: "rgba(34,212,126,0.55)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                }}
            >
                {label}
            </label>
            {children}
            {hint && !error && (
                <p style={{ fontSize: "0.75rem", color: "rgba(240,241,245,0.28)", lineHeight: 1.5 }}>
                    {hint}
                </p>
            )}
            {error && (
                <p style={{ fontSize: "0.75rem", color: "#f04e66" }}>
                    {error}
                </p>
            )}
        </div>
    );
}
