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
                hint="Choose a unique, memorable name. Up to 64 characters."
                error={errors.name}
            >
                <div className="relative">
                    <input
                        className={inputCls(errors.name)}
                        maxLength={64}
                        placeholder="e.g. Spring Championship 2025"
                        value={data.name}
                        onChange={e => onChange({ name: e.target.value })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {data.name.length}/64
                    </span>
                </div>
                {/* Duplicate name warning — shows only when no validation error */}
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
                    {(Object.entries(FORMAT_INFO) as [TournamentFormat, { label: string }][]).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
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
                        {[4, 8, 16, 32, 64, 128].map(n => (
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
                                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${data.freeEntry ? "bg-blue-600" : "bg-gray-300"}`}
                            >
                                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${data.freeEntry ? "translate-x-4.5 ml-0.5" : "ml-0.5"}`} />
                            </div>
                            <span className="text-xs text-gray-500">Free</span>
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
                <FieldGroup label="Start Date" hint="Must be a future date." error={errors.startDate}>
                    <input
                        type="date"
                        min={today}
                        className={inputCls(errors.startDate)}
                        value={data.startDate}
                        onChange={e => onChange({ startDate: e.target.value })}
                    />
                </FieldGroup>
                <FieldGroup label="Start Time (UTC)" error={errors.startTime}>
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