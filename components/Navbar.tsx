"use client";

import { Wallet } from "lucide-react";
import { useState } from "react";

export function Navbar() {
    const [isConnected, setIsConnected] = useState(false);

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">BC</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">BracketChain</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <a href="#" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                            Explore
                        </a>
                        <a href="#" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                            Docs
                        </a>
                        <a href="#" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                            About
                        </a>
                    </div>

                    <button
                        onClick={() => setIsConnected(!isConnected)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                    >
                        <Wallet className="w-5 h-5" />
                        {isConnected ? "Connected" : "Connect Wallet"}
                    </button>
                </div>
            </div>
        </nav>
    );
}
