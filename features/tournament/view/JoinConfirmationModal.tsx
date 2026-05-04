"use client";

import { X, ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TournamentView } from "@/types/tournament";

interface Props {
    tournament: TournamentView;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isJoining: boolean;
}

export function JoinConfirmationModal({ tournament, isOpen, onClose, onConfirm, isJoining }: Props) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative h-32 bg-blue-600 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
                    <ShieldCheck className="w-16 h-16 text-white relative z-10" />
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                        disabled={isJoining}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 flex flex-col gap-6">
                    <div className="text-center flex flex-col gap-2">
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">
                            Join {tournament.name}?
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Confirm your entry to reserve your spot in the bracket.
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-5 flex flex-col gap-4 border border-gray-100">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Entry Fee</span>
                            <span className="text-xl font-black text-gray-900">
                                {tournament.entryFee === 0 ? "Free Entry" : `$${tournament.entryFee} USDC`}
                            </span>
                        </div>
                        
                        <div className="flex gap-3 text-xs text-blue-700 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                            <Info className="w-4 h-4 shrink-0" />
                            <p className="leading-relaxed">
                                Your entry fee will be held in escrow by the Solana smart contract until the tournament completes.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button 
                            onClick={onConfirm}
                            disabled={isJoining}
                            className="h-14 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                            {isJoining ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Joining tournament...
                                </span>
                            ) : (
                                "Confirm & Join"
                            )}
                        </Button>
                        <button 
                            onClick={onClose}
                            className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors py-2"
                            disabled={isJoining}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
