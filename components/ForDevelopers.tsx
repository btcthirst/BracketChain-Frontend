"use client";

import { Copy, Check, Shield } from "lucide-react";
import { useState } from "react";
import { MotionDiv } from "./ui/motion-wraper";
import { EXTERNAL_LINKS } from "@/constants/links";

export function ForDevelopers() {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText("npm install @bracketchain/sdk");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section className="bg-[#0a1929] py-20">
            <div className="container mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <MotionDiv
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-4xl font-bold text-white mb-6">For Developers</h2>
                        <p className="text-xl text-gray-300 mb-8">
                            Integrate tournament infrastructure into your game with just a few lines of code.
                        </p>

                        <div className="bg-[#1e293b] rounded-lg p-6 mb-6 font-mono text-sm">
                            <div className="text-gray-400 mb-2">Install the SDK</div>
                            <div className="flex items-center justify-between gap-4">
                                <code className="text-green-400">npm install @bracketchain/sdk</code>
                                <button
                                    onClick={handleCopy}
                                    className="flex-shrink-0 p-2 hover:bg-gray-700 rounded transition-colors"
                                    aria-label="Copy command"
                                >
                                    {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 items-center">
                            <a
                                href={EXTERNAL_LINKS.docs}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition-colors"
                            >
                                Read the Docs
                            </a>
                            <div className="flex items-center gap-2 text-gray-300">
                                <Shield className="w-5 h-5 text-green-400" />
                                <span>Audited by Certik</span>
                            </div>
                        </div>
                    </MotionDiv>

                    <MotionDiv
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="bg-[#1e293b] rounded-lg p-6 overflow-hidden"
                    >
                        <pre className="text-sm text-gray-300 overflow-x-auto leading-relaxed"><code>{`import { BracketChain } from '@bracketchain/sdk';

const tournament = await BracketChain.create({
  name: 'My Tournament',
  prizePool: 1000,
  maxPlayers: 16,
});

await tournament.start();`}</code></pre>
                    </MotionDiv>
                </div>
            </div>
        </section>
    );
}