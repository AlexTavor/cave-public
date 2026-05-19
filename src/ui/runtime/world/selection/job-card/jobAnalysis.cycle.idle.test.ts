import { describe, expect, it } from "vitest";
import { resolveJobCycleStatus } from "./jobAnalysis.cycle";

describe("resolveJobCycleStatus", () => {
    it("treats gated jobs as idle when base demand is zero", () => {
        const result = resolveJobCycleStatus(
            {
                display: { bars: [{ key: "state.cycle" }] },
                state: {
                    cycle: { value: 0, max: 50 },
                    cycle_active: { value: 1 },
                },
                powerSink: {
                    baseDemand: { body: 0, mind: 0, social: 0 },
                    allocatedDraw: { body: 0, mind: 0, social: 44 },
                },
            } as any,
            null,
        );

        expect(result.ticksRemaining).toBeNull();
    });

    it("keeps countdowns for active jobs with real demand", () => {
        const result = resolveJobCycleStatus(
            {
                display: { bars: [{ key: "state.cycle" }] },
                state: {
                    cycle: { value: 0, max: 50 },
                    cycle_active: { value: 1 },
                },
                powerSink: {
                    baseDemand: { body: 25, mind: 0, social: 0 },
                    allocatedDraw: { body: 25, mind: 0, social: 0 },
                },
            } as any,
            null,
        );

        expect(result.ticksRemaining).toBeGreaterThan(0);
    });
});
