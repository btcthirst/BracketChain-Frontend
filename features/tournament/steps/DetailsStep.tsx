import { FORMAT_INFO } from "@/constants/tournament";
import { inputCls } from "../utils/utils";
import { DetailsData, TournamentFormat } from "@/types/tournament";
import { FieldGroup } from "./FieldGroup";
import { DuplicateNameWarning } from "./DuplicateNameWarning";

export function DetailsStep({
    data,
    onChange,
    errors,
}: {
    data: DetailsData;
    onChange: (d: Partial<DetailsData>) => void;
    errors: Partial<Record<keyof DetailsData, string>>;
}) {
    const today = new Date().toISOString().split("T")[0];

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

            <div className="grid grid-cols-2 gap-4">
                <FieldGroup
                    label="Max Participants"
                    hint="Brackets are filled first-come first-served."
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
                    hint={data.freeEntry ? "Free entry — open to all." : "Charged in the selected prize token."}
                    error={errors.entryFee}
                >
                    <div className="flex gap-2 items-center">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <div
                                onClick={() => onChange({ freeEntry: !data.freeEntry })}
                                style={{
                                    position: "relative",
                                    display: "inline-flex",
                                    height: 20,
                                    width: 36,
                                    borderRadius: 999,
                                    transition: "background 0.2s",
                                    background: data.freeEntry ? "#22d47e" : "rgba(255,255,255,0.12)",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                }}
                            >
                                <span
                                    style={{
                                        display: "inline-block",
                                        width: 16,
                                        height: 16,
                                        borderRadius: "50%",
                                        background: "#f0f1f5",
                                        position: "absolute",
                                        top: 2,
                                        left: data.freeEntry ? 18 : 2,
                                        transition: "left 0.2s",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                    }}
                                />
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "rgba(240,241,245,0.45)" }}>Free</span>
                        </label>
                        {!data.freeEntry && (
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className={inputCls(errors.entryFee) + " flex-1"}
                                placeholder="0.00"
                                value={data.entryFee}
                                onChange={e => onChange({ entryFee: e.target.value })}
                            />
                        )}
                    </div>
                </FieldGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FieldGroup
                    label="Registration Closes"
                    hint="Players can join until this moment. Must be in the future."
                    error={errors.startDate}
                >
                    <input
                        type="date"
                        min={today}
                        className={inputCls(errors.startDate)}
                        value={data.startDate}
                        onChange={e => onChange({ startDate: e.target.value })}
                    />
                </FieldGroup>
                <FieldGroup label="Time (UTC)" error={errors.startTime}>
                    <input
                        type="time"
                        className={inputCls(errors.startTime)}
                        value={data.startTime}
                        onChange={e => onChange({ startTime: e.target.value })}
                    />
                </FieldGroup>
            </div>
        </div>
    );
}
