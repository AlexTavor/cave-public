import { describe, expect, it } from "vitest";
import { analyzeJobStatus } from "./jobAnalysis";
import { resolveJobCycleBinding } from "./jobAnalysis.cycle";

const runtime = {
    getEntity: () => ({ id: "sys_world", cave: { ownedHabiti: [] } }),
    getCartridge: () => ({
        config: { habiti: {} },
        blueprints: {
            forge: {
                components: {
                    display: {
                        bars: [
                            { key: "state.cycle", maxKey: "state.cycle.max" },
                        ],
                    },
                    behavior: {
                        rules: [
                            {
                                id: "sys_produce_wood_0",
                                sortKey: "a",
                                conditions: [],
                                actions: [
                                    {
                                        type: "MUTATE",
                                        target: "self.state.wood.value",
                                        op: "ADD",
                                        value: "self.state.vals_prod_wood_amt_0.value",
                                    },
                                ],
                            },
                            {
                                id: "sys_convert_default_0",
                                sortKey: "b",
                                conditions: [],
                                actions: [
                                    {
                                        type: "MUTATE",
                                        target: "self.state.wood.value",
                                        op: "SUB",
                                        value: "self.state.vals_conv_in_wood_0_0.value",
                                    },
                                    {
                                        type: "MUTATE",
                                        target: "self.state.heat.value",
                                        op: "ADD",
                                        value: "self.state.vals_conv_out_heat_0_0.value",
                                    },
                                ],
                            },
                        ],
                    },
                },
            },
        },
    }),
} as any;

describe("jobAnalysis", () => {
    it("resolves cycle bindings from display bars", () => {
        expect(
            resolveJobCycleBinding({ blueprintId: "forge" } as any, runtime),
        ).toEqual({
            valuePath: "state.cycle.value",
            maxPath: "state.cycle.max",
        });
        expect(
            resolveJobCycleBinding(
                {
                    display: {
                        bars: [{ key: "state.cycle", maxKey: "state.alt.max" }],
                    },
                } as any,
                runtime,
            ),
        ).toEqual({ valuePath: "state.cycle.value", maxPath: "state.alt.max" });
        expect(
            resolveJobCycleBinding(
                { display: { bars: [{ key: "state.cycle", max: 12 }] } } as any,
                runtime,
            ),
        ).toEqual({ valuePath: "state.cycle.value", maxValue: 12 });
        expect(
            resolveJobCycleBinding({ display: { bars: [] } } as any, runtime),
        ).toBeNull();
    });

    it("reads cycle progress from blueprint display bars", () => {
        // Given
        const entity = {
            blueprintId: "forge",
            state: { cycle: { value: 20, max: 100 } },
            powerSink: { allocatedDraw: { body: 5, mind: 0, social: 0 } },
        } as any;

        // When
        const result = analyzeJobStatus(entity, runtime);

        // Then
        expect(result.cycleCurrent).toBe(20);
        expect(result.cycleMax).toBe(100);
        expect(result.ticksRemaining).toBeCloseTo(800);
    });

    it("reads next-cycle groups from blueprint behavior", () => {
        // Given
        const entity = {
            blueprintId: "forge",
            state: {
                vals_prod_wood_amt_0: { value: 3 },
                vals_conv_in_wood_0_0: { value: 2 },
                vals_conv_out_heat_0_0: { value: 5 },
            },
        } as any;

        // When
        const result = analyzeJobStatus(entity, runtime);

        // Then
        expect(result.nextCycleGroups.map((group) => group.kind)).toEqual([
            "production",
            "conversion",
        ]);
        expect(result.nextCycleGroups[1].effects).toEqual([
            expect.objectContaining({ label: "wood", valueText: "-2" }),
            expect.objectContaining({ label: "heat", valueText: "+5" }),
        ]);
    });
});

