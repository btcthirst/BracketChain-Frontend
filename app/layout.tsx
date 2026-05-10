import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import Providers from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BracketChain — Trustless tournaments on Solana",
    template: "%s — BracketChain",
  },
  description:
    "Run on-chain tournaments with trustless escrow and instant USDC payouts. No custodian, no payout delays, no fragmented tooling.",
  // metadataBase: new URL("https://bracketchain.xyz"),
  openGraph: {
    title: "BracketChain — Trustless tournaments on Solana",
    description:
      "Run on-chain tournaments with trustless escrow and instant USDC payouts.",
    siteName: "BracketChain",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BracketChain — Trustless tournaments on Solana",
    description:
      "Run on-chain tournaments with trustless escrow and instant USDC payouts.",
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppRouterCacheProvider>
            {children}
          </AppRouterCacheProvider>
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
