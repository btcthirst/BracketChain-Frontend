import { FORMAT_INFO } from "@/constants/tournament";
import { inputCls } from "../utils/utils";
import {
    DetailsData,
    TournamentFormat,
    UIArbitratorChoice,
    UIGameChoice,
    UISettlementChoice,
} from "@/types/tournament";
import { FieldGroup } from "./FieldGroup";
import { DuplicateNameWarning } from "./DuplicateNameWarning";

// Settlement-mode options. All three are valid on-chain today, but Oracle
// only fully works after the organizer commits + binds a Switchboard feed
// (the feed-factory is gated on external validation — see Stage C plan).
const SETTLEMENT_OPTIONS: { key: UISettlementChoice; label: string; available: boolean; hint: string }[] = [
    {
        key: "organizer_only",
        label: "Organizer reports",
        available: true,
        hint: "You sign every match result. Simplest flow.",
    },
    {
        key: "player_reported",
        label: "Players report",
        available: true,
        hint: "Loser confirms or disputes within a window; permissionless claim after.",
    },
    {
        key: "oracle",
        label: "Oracle (Switchboard)",
        available: true,
        hint: "Organizer commits a lobby + binds a Switchboard feed; a relayer reports the winner.",
    },
];

// Game-identity options. Phase 1 supports `Manual` only in the form (Dota 2
// needs the SAS attestation flow which lands in V1.3; the rest aren't wired
// on chain yet and reject with `GameNotYetSupported`).
const GAME_OPTIONS: { key: UIGameChoice; label: string; available: boolean }[] = [
    { key: "manual", label: "Manual (no game identity)", available: true },
    { key: "dota2", label: "Dota 2 (requires SAS attestation — V1.3)", available: false },
    { key: "cs2faceit", label: "CS2 / FACEIT — coming soon", available: false },
    { key: "valorant", label: "Valorant — coming soon", available: false },
    { key: "lol", label: "League of Legends — coming soon", available: false },
];

// Arbitrator options. V1.2 hard-codes arbitrator = organizer at create-time;
// Squads + custom address reassignment land in V1.3.
const ARBITRATOR_OPTIONS: { key: UIArbitratorChoice; label: string; available: boolean }[] = [
    { key: "organizer", label: "Organizer wallet (you)", available: true },
    { key: "squads", label: "Squads multisig — V1.3", available: false },
    { key: "custom", label: "Custom address — V1.3", available: false },
];

export function DetailsStep({
    data,
    onChange,
    errors,
}: {
    data: DetailsData;
    onChange: (d: Partial<DetailsData>) => void;
    errors: Partial<Record<keyof DetailsData, string>>;
}) {
    // <input type="datetime-local"> uses LOCAL time; pre-compute a sane `min`
    // for "right now" in the same format ("YYYY-MM-DDTHH:MM").
    const nowLocal = (() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // shift to local
        return d.toISOString().slice(0, 16);
    })();

    const settlementHint = SETTLEMENT_OPTIONS.find(o => o.key === data.settlementMode)?.hint ?? "";

    return (
        <div className="flex flex-col gap-6">
            <FieldGroup
                label="Tournament Name"
                hint="Choose a unique, memorable name. Up to 32 characters (Solana per-seed limit)."
                error={errors.name}
            >
                <div className="relative">
                    <input
                        className={inputCls(errors.name)}
                        maxLength={32}
                        placeholder="e.g. Spring Championship 2026"
                        value={data.name}
                        onChange={e => onChange({ name: e.target.value })}
                    />
                    <span
                        style={{
                            position: "absolute",
                            right: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "0.68rem",
                            color: "rgba(240,241,245,0.25)",
                        }}
                    >
                        {data.name.length}/32
                    </span>
                </div>
                {!errors.name && <DuplicateNameWarning name={data.name} />}
            </FieldGroup>

            {/* 2×2 grid: format / max-participants on top row, entry-fee /
                registration-close on the second. Single column on phones. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FieldGroup
                    label="Format"
                    hint={FORMAT_INFO[data.format].desc}
                    error={errors.format}
                >
                    <select
                        className={inputCls(errors.format)}
                        value={data.format}
                        onChange={e => onChange({ format: e.target.value as TournamentFormat })}
                    >
                        {(Object.entries(FORMAT_INFO) as [
                            TournamentFormat,
                            { label: string; available: boolean }
                        ][]).map(([key, { label, available }]) => (
                            <option key={key} value={key} disabled={!available}>
                                {label}
                            </option>
                        ))}
                    </select>
                </FieldGroup>

                <FieldGroup
                    label="Max Participants"
                    hint="First-come first-served."
                    error={errors.maxParticipants}
                >
                    <select
                        className={inputCls(errors.maxParticipants)}
                        value={data.maxParticipants}
                        onChange={e => onChange({ maxParticipants: Number(e.target.value) as DetailsData["maxParticipants"] })}
                    >
                        {[2, 4, 8, 16, 32, 64, 128].map(n => (
                            <option key={n} value={n}>{n} players</option>
                        ))}
                    </select>
                </FieldGroup>

                <FieldGroup
                    label="Entry Fee (USD)"
                    hint="Leave blank or 0 for free entry."
                    error={errors.entryFee}
                >
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputCls(errors.entryFee)}
                        placeholder="0.00 (free)"
                        value={data.entryFee}
                        onChange={e => onChange({ entryFee: e.target.value })}
                    />
                </FieldGroup>

                <FieldGroup
                    label="Registration Closes"
                    hint="Local time; must be in the future."
                    error={errors.startAt}
                >
                    <input
                        type="datetime-local"
                        min={nowLocal}
                        className={inputCls(errors.startAt)}
                        value={data.startAt}
                        onChange={e => onChange({ startAt: e.target.value })}
                    />
                </FieldGroup>
            </div>

            <FieldGroup
                label="Result Settlement"
                hint={settlementHint}
                error={errors.settlementMode}
            >
                <select
                    className={inputCls(errors.settlementMode)}
                    value={data.settlementMode}
                    onChange={e => onChange({ settlementMode: e.target.value as UISettlementChoice })}
                >
                    {SETTLEMENT_OPTIONS.map(({ key, label, available }) => (
                        <option key={key} value={key} disabled={!available}>{label}</option>
                    ))}
                </select>
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4">
                <FieldGroup
                    label="Game"
                    hint="Match identity verification. Phase 1 supports Manual only."
                    error={errors.game}
                >
                    <select
                        className={inputCls(errors.game)}
                        value={data.game}
                        onChange={e => onChange({ game: e.target.value as UIGameChoice })}
                    >
                        {GAME_OPTIONS.map(({ key, label, available }) => (
                            <option key={key} value={key} disabled={!available}>{label}</option>
                        ))}
                    </select>
                </FieldGroup>

                <FieldGroup
                    label="Arbitrator"
                    hint="Resolves disputed oracle results. V1.2: always the organizer."
                    error={errors.arbitrator}
                >
                    <select
                        className={inputCls(errors.arbitrator)}
                        value={data.arbitrator}
                        onChange={e => onChange({ arbitrator: e.target.value as UIArbitratorChoice })}
                    >
                        {ARBITRATOR_OPTIONS.map(({ key, label, available }) => (
                            <option key={key} value={key} disabled={!available}>{label}</option>
                        ))}
                    </select>
                </FieldGroup>
            </div>
        </div>
    );
}
