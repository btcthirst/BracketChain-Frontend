"use client";

export function BackgroundGlow() {
    return (
        <>
            {/* Base dark background — fixed, always covers viewport */}
            <div
                aria-hidden="true"
                className="fixed inset-0 -z-20"
                style={{ background: "linear-gradient(180deg, #05060a, #080910 48%, #05060a)" }}
            />

            {/* Glows — absolute at page top, scroll away with content */}
            <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 -z-10 h-screen overflow-hidden"
                style={{
                    background:
                        "radial-gradient(circle at 20% 10%, rgba(0,255,102,.12), transparent 45%)," +
                        "radial-gradient(circle at 82% 24%, rgba(162,118,255,.12), transparent 48%)",
                }}
            >
                {/* Dot grid */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: "radial-gradient(rgba(0,255,102,0.08) 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                        maskImage: "radial-gradient(ellipse 55% 70% at 35% 50%, black 20%, transparent 100%)",
                        WebkitMaskImage: "radial-gradient(ellipse 55% 70% at 35% 50%, black 20%, transparent 100%)",
                        opacity: 0.5,
                    }}
                />
            </div>
        </>
    );
}
