import type { NextConfig } from "next";
import { join } from "node:path";

const nextConfig: NextConfig = {
    // `@bracketchain/sdk` is consumed via a pnpm `link:` to ../BracketChain-Sdk
    // (feat/v1). It ships ESM/CJS dist but its real path is the sibling repo,
    // outside the app dir. Turbopack resolves symlinks to their real path and
    // refuses modules outside the project root, so widen the root to the
    // shared parent (git-workspace) and transpile the linked package.
    turbopack: {
        root: join(__dirname, ".."),
    },
    transpilePackages: ["@bracketchain/sdk"],
};

export default nextConfig;
