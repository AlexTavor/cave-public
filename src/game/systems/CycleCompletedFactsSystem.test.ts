import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import type { RuntimeEntity } from "../../engine/runtime/types";
import { CycleCompletedFactsSystem } from "./CycleCompletedFactsSystem";
import { createCommandBuffer } from "./testUtils";

const tick = (...entities: RuntimeEntity[]) => {
    const { buffer, commands } = createCommandBuffer();
    new CycleCompletedFactsSystem().tick(
        new Snapshot(entities, { getBody: () => undefined } as any),
        commands,
    );
    return buffer;
};

describe("CycleCompletedFactsSystem", () => {
    it("emits mirrored facts when a cycle is complete", () => {
        expect(
            tick({
                id: "job-1",
                blueprintId: "job",
                state: { cycle: { value: 3, max: 3 } },
            } as RuntimeEntity),
        ).toEqual([
            {
                type: "ADJUST_FACT",
                payload: {
                    scope: "run",
                    factType: "cycle_completed",
                    factAbout: "job",
                    delta: 1,
                },
            },
            {
                type: "ADJUST_FACT",
                payload: {
                    scope: "permanent",
                    factType: "cycle_completed",
                    factAbout: "job",
                    delta: 1,
                },
            },
        ]);
    });

    it("does not emit when the cycle is incomplete", () => {
        expect(
            tick({
                id: "job-1",
                blueprintId: "job",
                state: { cycle: { value: 2, max: 3 } },
            } as RuntimeEntity),
        ).toEqual([]);
    });

    it.each([0, -1])("does not emit when cycle.max is %p", (max) => {
        expect(
            tick({
                id: "job-1",
                blueprintId: "job",
                state: { cycle: { value: 3, max } },
            } as RuntimeEntity),
        ).toEqual([]);
    });

    it("does not emit when blueprintId is missing", () => {
        expect(
            tick({
                id: "job-1",
                state: { cycle: { value: 3, max: 3 } },
            } as RuntimeEntity),
        ).toEqual([]);
    });

    it("does not emit when cycle state is missing", () => {
        expect(
            tick({ id: "job-1", blueprintId: "job" } as RuntimeEntity),
        ).toEqual([]);
    });
});
