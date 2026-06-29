// constants/links.ts

// ─── Internal routes ──────────────────────────────────────────────────────────

export const NAV_LINKS = [
    { label: "HOME", href: "/#top" },
    { label: "PROTOCOL", href: "/#protocol" },
    { label: "LIVE DEMO", href: "/#action" },
    { label: "ECOSYSTEM", href: "/#ecosystem" },
    { label: "MARKET", href: "/#market" },
    { label: "ROADMAP", href: "/#roadmap" },
];

export const ROUTES = {
    home: "/",
    explore: "/explore",
    create: "/create",
    dashboard: "/dashboard",
    tournament: (id: string) => `/t/${id}`,
    player: (wallet: string) => `/player/${wallet}`,
    account: "/account",
    about: "/about",
} as const;

// ─── External links ───────────────────────────────────────────────────────────

export const EXTERNAL_LINKS = {
    docs: "https://docs.bracketchain.io",
    blog: "https://bracketchain.io/blog",
    github: "https://github.com/VitalikCholan/BracketChain-Main",
    twitter: "https://twitter.com/bracketchain",
    discord: "https://discord.gg/bracketchain",
    onRamp: "https://bracketchain.io/buy",
} as const;

// ─── Solana ───────────────────────────────────────────────────────────────────

export const SOLANA = {
    explorer: "https://explorer.solana.com",
    cluster: "devnet",
    explorerTx: (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
    explorerAddr: (addr: string) => `https://explorer.solana.com/address/${addr}?cluster=devnet`,
} as const;