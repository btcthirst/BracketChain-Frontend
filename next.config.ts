import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    transpilePackages: ["@bracketchain/sdk"],

    // Serves the pixel-perfect static landing (public/landing/index.html) at
    // the site root "/". `beforeFiles` runs before App Router, so it shadows
    // app/page.tsx without deleting it (fully reversible: remove this block).
    async rewrites() {
        return {
            beforeFiles: [
                { source: "/", destination: "/landing/index.html" },
            ],
        };
    },
};

export default nextConfig;
