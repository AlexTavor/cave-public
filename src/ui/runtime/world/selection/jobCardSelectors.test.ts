import { describe, expect, it } from "vitest";
import {
    analysisComparer,
    createJobAnalysisSelector,
} from "./jobCardSelectors";

const base = {
    cycleCurrent: 1,
    cycleMax: 10,
    ticksRemaining: 5,
    nextCycleGroups: [],
};

describe("jobCardSelectors", () => {
    it("builds a unary selector from runtime", () => {
        expect(
            createJobAnalysisSelector(null)({
                state: {},
                powerSink: {},
            } as any),
        ).toEqual(
            expect.objectContaining({
                cycleCurrent: null,
                nextCycleGroups: [],
            }),
        );
    });

    it("returns true for equivalent analysis payloads", () => {
        expect(analysisComparer(base, { ...base })).toBe(true);
    });

    it("returns false when the countdown changes", () => {
        expect(analysisComparer(base, { ...base, ticksRemaining: 6 })).toBe(
            false,
        );
    });

    it("returns false when next-cycle groups change", () => {
        expect(
            analysisComparer(base, {
                ...base,
                nextCycleGroups: [
                    {
                        id: "production",
                        kind: "production",
                        title: "Production",
                        effects: [],
                    },
                ],
            } as any),
        ).toBe(false);
    });
});
