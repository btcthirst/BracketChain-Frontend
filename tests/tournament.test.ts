import { formatStartsIn, toUiTournament } from "../lib/tournament";
import type { IndexerTournament } from "../lib/indexer";

describe("Tournament Utilities", () => {
    describe("formatStartsIn", () => {
        const now = new Date("2026-05-02T12:00:00Z").getTime();

        it("shows minutes if less than 1 hour", () => {
            const deadline = new Date("2026-05-02T12:45:00Z").toISOString();
            expect(formatStartsIn(deadline, now)).toBe("45m");
        });

        it("shows hours and minutes if less than 24 hours", () => {
            const deadline = new Date("2026-05-02T14:30:00Z").toISOString();
            expect(formatStartsIn(deadline, now)).toBe("2h 30m");
        });

        it("shows days if more than 24 hours", () => {
            const deadline = new Date("2026-05-03T15:00:00Z").toISOString();
            expect(formatStartsIn(deadline, now)).toBe("1d 3h");
        });

        it("shows closed if deadline passed", () => {
            const deadline = new Date("2026-05-02T11:00:00Z").toISOString();
            expect(formatStartsIn(deadline, now)).toBe("Registration closed");
        });
    });

    describe("toUiTournament", () => {
        const mockTournament: IndexerTournament = {
            address: "addr123",
            organizer: "org123",
            name: "Test Tournament",
            tokenMint: "usdc123",
            entryFee: "1000000", // 1 USDC
            organizerDeposit: "0",
            maxParticipants: 16,
            payoutPreset: "Standard",
            registrationDeadline: "2026-05-02T15:00:00Z",
            status: "Registration",
            champion: null,
            grossPool: "4000000", // 4 USDC -> 4 participants
            feeAmount: null,
            netPool: null,
            createdAt: "2026-05-01T12:00:00Z",
            completedAt: null,
            createdTxSig: "sig123",
            completedTxSig: null,
            chainSlotAtWrite: "0",
        };

        it("calculates participant count correctly from grossPool", () => {
            const ui = toUiTournament(mockTournament);
            expect(ui.participants).toBe(4);
            expect(ui.prizePool).toBe(4);
        });

        it("handles null grossPool by defaulting to 0 participants", () => {
            const tournament = { ...mockTournament, grossPool: null };
            const ui = toUiTournament(tournament);
            expect(ui.participants).toBe(0);
            // Prize pool defaults to max if gross is null (estimate)
            expect(ui.prizePool).toBe(16); 
        });

        it("handles zero entry fee (free tournament)", () => {
            const tournament = { ...mockTournament, entryFee: "0", grossPool: "0" };
            const ui = toUiTournament(tournament);
            expect(ui.participants).toBe(0);
            expect(ui.prizePool).toBe(0);
        });
    });
});
