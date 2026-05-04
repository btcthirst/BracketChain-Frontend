"use client";

import { ExternalLink, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import { SOLANA } from "@/constants/links";
import type { TournamentView } from "@/types/tournament";
import Link from "next/link";
import { ROUTES } from "@/constants/links";

interface Props {
    tournament: TournamentView;
    isOrganizer?: boolean;
}

export function PayoutView({ tournament, isOrganizer }: Props) {
    const totalDistributed = tournament.payouts.reduce((sum, p) => sum + p.amount, 0);
    const protocolFee = (tournament.prizePool * 0.035);
    
    // Sort by placement
    const sortedPayouts = [...tournament.payouts].sort((a, b) => a.place - b.place);
    
    const isPending = tournament.payouts.some(p => !p.txSignature);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                    Payout Distribution
                </h3>
                {isPending && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-tighter animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Processing...
                    </div>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-tighter">Place</th>
                            <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-tighter">Player</th>
                            <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-tighter text-right">Amount</th>
                            <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-tighter text-right">%</th>
                            <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-tighter text-center">Tx</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {sortedPayouts.map((p) => (
                            <tr key={p.place} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-4">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black ${
                                        p.place === 1 ? "bg-amber-100 text-amber-700" :
                                        p.place === 2 ? "bg-slate-100 text-slate-600" :
                                        p.place === 3 ? "bg-orange-50 text-orange-700" :
                                        "bg-gray-50 text-gray-400"
                                    }`}>
                                        {p.place}
                                    </div>
                                </td>
                                <td className="px-4 py-4 font-mono">
                                    {p.recipient ? (
                                        <Link 
                                            href={ROUTES.player(p.recipient.address)}
                                            className="text-blue-600 hover:underline font-bold"
                                        >
                                            {p.recipient.display}
                                        </Link>
                                    ) : (
                                        <span className="text-gray-400 italic">Unclaimed</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 text-right font-black text-gray-900">
                                    ${p.amount.toLocaleString()}
                                </td>
                                <td className="px-4 py-4 text-right text-gray-500 font-medium">
                                    {p.pct}%
                                </td>
                                <td className="px-4 py-4 text-center">
                                    {p.txSignature ? (
                                        <a 
                                            href={SOLANA.explorerTx(p.txSignature)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    ) : isOrganizer ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-[10px] font-bold text-red-500 uppercase">Failed</span>
                                            <button className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-tighter">
                                                Retry
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center">
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-50/80 border-t border-gray-100 font-bold">
                            <td colSpan={2} className="px-4 py-4 text-gray-500">
                                Total Distributed
                            </td>
                            <td className="px-4 py-4 text-right text-gray-900">
                                ${totalDistributed.toLocaleString()}
                            </td>
                            <td colSpan={2} className="px-4 py-4 text-right text-[10px] text-gray-400 font-medium">
                                Protocol Fee: ${protocolFee.toLocaleString()} (3.5%)
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="bg-blue-50/50 rounded-2xl p-4 flex gap-3 border border-blue-100/50 items-start">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-bold text-blue-900">Verified On-Chain</p>
                    <p className="text-[11px] text-blue-700/80 leading-relaxed">
                        All payouts are immutable transactions on the Solana blockchain. 
                        Winners receive their funds instantly once the tournament is finalized.
                    </p>
                    <a 
                        href={SOLANA.explorerAddr(tournament.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1 hover:underline flex items-center gap-1"
                    >
                        Audit Tournament Account <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                </div>
            </div>
        </div>
    );
}
