"use client";

import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";
import { ROUTES, EXTERNAL_LINKS } from "@/constants/links";

export function Navbar() {
    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    <Link href={ROUTES.home} className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">BC</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">BracketChain</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        <Link href={ROUTES.explore} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                            Explore
                        </Link>
                        <a href={EXTERNAL_LINKS.docs} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                            Docs
                        </a>
                        <Link href={ROUTES.about} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                            About
                        </Link>
                    </div>

                    <ConnectButton />
                </div>
            </div>
        </nav>
    );
}