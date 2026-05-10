import { ExternalLink, Share2, Check } from "lucide-react";
import { useState } from "react";
import type { TournamentView, TournamentStatus, TournamentFormat } from "@/types/tournament";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { useDeadlineReached } from "@/hooks/useDeadlineReached";

const STATUS_CONFIG: Record<TournamentStatus, { label: string; className: string }> = {
    registration: { label: "Registration Open", className: "bg-green-100 text-green-700 border-green-200" },
    in_progress: { label: "In Progress", className: "bg-blue-100  text-blue-700  border-blue-200" },
    completed: { label: "Completed", className: "bg-gray-100  text-gray-700  border-gray-200" },
    cancelled: { label: "Cancelled", className: "bg-red-100   text-red-700   border-red-200" },
};

// Used when on-chain status is still `registration` but the deadline has passed
// (program flips status only on the next interaction). Without this the header
// badge and the countdown disagree — see screenshot of /t/<pda> showing both
// "Registration Open" and "Registration Closed".
const REGISTRATION_CLOSED_BADGE = {
    label: "Registration Closed",
    className: "bg-amber-100 text-amber-700 border-amber-200",
};

const FORMAT_LABEL: Record<TournamentFormat, string> = {
    SE: "Single Elim", DE: "Double Elim", Swiss: "Swiss", RR: "Round Robin",
};

export function TournamentHeader({ tournament }: { tournament: TournamentView }) {
    const [copied, setCopied] = useState(false);

    const deadlineReached = useDeadlineReached(tournament.registrationDeadline);
    const registrationClosed =
        tournament.status === "registration" && deadlineReached;

    const status = registrationClosed
        ? REGISTRATION_CLOSED_BADGE
        : STATUS_CONFIG[tournament.status];

    function handleShare() {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const twitterText = encodeURIComponent(
        `Join "${tournament.name}" — ${tournament.prizePool.toLocaleString("en-US")} ${tournament.token} prize pool on @BracketChain!\n${window.location.href}`
    );

    return (
        <div className="bg-[#0a1929] text-white">
            <div className="container mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${status.className}`}>
                                {status.label}
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold border border-white/20 text-gray-300">
                                {FORMAT_LABEL[tournament.format]}
                            </span>
                            {tournament.game && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold border border-white/20 text-gray-300">
                                    {tournament.game}
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold">{tournament.name}</h1>
                    </div>

                    {/* Share actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-sm font-medium transition-colors"
                        >
                            {copied
                                ? <><Check className="w-4 h-4 text-green-400" /> Copied!</>
                                : <><Share2 className="w-4 h-4" /> Share</>
                            }
                        </button>
                        <a
                            href={`https://twitter.com/intent/tweet?text=${twitterText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1d9bf0] hover:bg-[#1a8cd8] text-sm font-medium transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Tweet
                        </a>
                    </div>
                </div>

                {/* Info strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-6 border-t border-white/10">
                    <InfoMetric label="Prize Pool" value={`$${tournament.prizePool.toLocaleString("en-US")} ${tournament.token}`} />
                    <InfoMetric label="Participants" value={`${tournament.participants.length}/${tournament.maxParticipants}`} />
                    <InfoMetric label="Entry Fee" value={tournament.entryFee === 0 ? "Free" : `$${tournament.entryFee} ${tournament.token}`} />
                    <InfoMetric
                        // Counts down to `registration_deadline`, NOT to a tournament
                        // start time — start is organizer-triggered (or "Start Early")
                        // and there is no on-chain auto-start.
                        label={
                            tournament.status === "cancelled"
                                ? "Refunds"
                                : tournament.status === "registration"
                                    ? registrationClosed ? "Registration" : "Registration closes in"
                                    : "Started"
                        }
                        value={
                            tournament.status === "cancelled"
                                ? `${tournament.refundTxSignatures.length} issued`
                                : tournament.status === "registration"
                                    ? <CountdownTimer deadline={tournament.registrationDeadline} />
                                    : new Date(tournament.startTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                        }
                    />
                </div>
            </div>
        </div>
    );
}

function InfoMetric({ label, value }: { label: string; value: string | React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
            <span className="text-lg font-bold text-white">{value}</span>
        </div>
    );
}