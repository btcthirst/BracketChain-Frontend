"use client";

/**
 * BackgroundGlow — альтернативна версія для порівняння.
 *
 * Відмінності від твоєї:
 * - Layer 2 (bottom-left) більший і зміщений глибше — glow виглядає масивнішим
 * - Layer 3 (top-right) має offset по вертикалі, щоб не зливатись з navbar
 * - Додатковий Layer 5: дуже тихий центральний bloom під контентом hero
 * - dot-grid mask витягнутий вертикально (ellipse 60% 90%), щоб точки
 *   зникали по горизонталі раніше — менше "захаращеності" на краях
 * - filter blur не використовується на dot-grid (він і так розмитий через opacity)
 * - усі glow-шари без filter:blur — замість цього великий radius у gradient,
 *   що дає плавніший результат без GPU-heavy blur на mobile
 */
export function BackgroundGlow() {
    return (
        <div
            aria-hidden="true"
            className="fixed inset-0 -z-10 overflow-hidden"
            style={{ background: "#06070b" }}
        >
            {/* Layer 1: Dot grid — вузький ellipse mask, точки зникають по краях */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage:
                        "radial-gradient(rgba(34,212,126,0.10) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    maskImage:
                        "radial-gradient(ellipse 60% 90% at 50% 40%, black 30%, transparent 100%)",
                    WebkitMaskImage:
                        "radial-gradient(ellipse 60% 90% at 50% 40%, black 30%, transparent 100%)",
                    opacity: 0.4,
                }}
            />

            {/* Layer 2: Bottom-left — основний зелений полюс */}
            <div
                className="absolute rounded-full"
                style={{
                    bottom: "-20%",
                    left: "-15%",
                    width: "70vw",
                    height: "70vw",
                    background:
                        "radial-gradient(circle, rgba(34,212,126,0.18) 0%, rgba(34,212,126,0.06) 35%, transparent 65%)",
                    opacity: 0.6,
                }}
            />

            {/* Layer 3: Top-right — вторинний тихий полюс */}
            <div
                className="absolute rounded-full"
                style={{
                    top: "-5%",
                    right: "-15%",
                    width: "45vw",
                    height: "45vw",
                    background:
                        "radial-gradient(circle, rgba(34,212,126,0.09) 0%, transparent 60%)",
                    opacity: 0.5,
                }}
            />

            {/* Layer 4: Centre-top bloom — ледь помітне свічення над hero */}
            <div
                className="absolute left-1/2"
                style={{
                    top: 0,
                    transform: "translateX(-50%)",
                    width: "90vw",
                    height: "50vh",
                    background:
                        "radial-gradient(ellipse at top, rgba(34,212,126,0.06) 0%, transparent 65%)",
                    opacity: 0.5,
                }}
            />

            {/* Layer 5: Mid-page центральний accent —
                з'являється під hero при скролі, щоб наступні секції
                також мали легкий зелений підсвіт */}
            <div
                className="absolute left-1/2 rounded-full"
                style={{
                    top: "55vh",
                    transform: "translateX(-50%)",
                    width: "50vw",
                    height: "50vw",
                    background:
                        "radial-gradient(circle, rgba(34,212,126,0.05) 0%, transparent 60%)",
                    opacity: 0.45,
                }}
            />
        </div>
    );
}