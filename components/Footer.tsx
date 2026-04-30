import Link from "next/link";
import { X, MessageCircle, FileText } from "lucide-react";
import GitHubIcon from "@mui/icons-material/GitHub";
import { ROUTES, EXTERNAL_LINKS } from "@/constants/links";

export function Footer() {
    return (
        <footer className="bg-gray-900 text-gray-300 py-12">
            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div>
                        <Link href={ROUTES.home} className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold">BC</span>
                            </div>
                            <span className="text-xl font-bold text-white">BracketChain</span>
                        </Link>
                        <p className="text-gray-400 mb-4">
                            Trustless tournament infrastructure powered by Solana.
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6">
                                <svg viewBox="0 0 397.7 311.7" fill="currentColor" className="text-purple-500">
                                    <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
                                    <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
                                    <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
                                </svg>
                            </div>
                            <span className="text-sm text-gray-400">Built on Solana</span>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 md:justify-end">
                        <div>
                            <h3 className="font-semibold text-white mb-3">Resources</h3>
                            <ul className="space-y-2">
                                <li>
                                    <a href={EXTERNAL_LINKS.docs} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Docs
                                    </a>
                                </li>
                                <li>
                                    <a href={EXTERNAL_LINKS.blog} className="hover:text-white transition-colors flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Blog
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-white mb-3">Community</h3>
                            <ul className="space-y-2">
                                <li>
                                    <a href={EXTERNAL_LINKS.github} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                                        <GitHubIcon className="w-4 h-4" />
                                        GitHub
                                    </a>
                                </li>
                                <li>
                                    <a href={EXTERNAL_LINKS.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                                        <X className="w-4 h-4" />
                                        Twitter
                                    </a>
                                </li>
                                <li>
                                    <a href={EXTERNAL_LINKS.discord} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                                        <MessageCircle className="w-4 h-4" />
                                        Discord
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
                    <p>&copy; {new Date().getFullYear()} BracketChain. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}