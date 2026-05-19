import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { conversionCompiler } from "./conversionCompiler";
import { Op } from "../../../data/schemas/primitives";

const makeDraft = () =>
    createBlueprint("hearth", {
        components: {
            state: {
                cycle: { value: 0, max: 100, visible: false },
                wood: { value: 5, max: 10, visible: true },
                heat: { value: 0, max: 120, visible: true },
            },
            behavior: {
                rules: [
                    {
                        id: "sys_cycle_accumulate",
                        sortKey: "sys_001",
                        conditions: [
                            {
                                id: "is_active",
                                sortKey: "0",
                                tokens: [
                                    {
                                        t: "ref" as const,
                                        v: "self.state.cycle_active",
                                    },
                                ],
                            },
                        ],
                        actions: [
                            {
                                type: "MUTATE" as const,
                                target: "self.state.cycle.value",
                                op: "ADD" as const,
                                value: "global.dt",
                            },
                        ],
                    },
                ],
            },
            passiveEffects: [
                {
                    op: "SET" as Op,
                    target: "self.powerSink.baseDemand.body",
                    value: 5,
                },
                {
                    op: "SET" as Op,
                    target: "self.powerSink.baseDemand.mind",
                    value: 20,
                },
            ],
        },
    });

const makeConfig = () => ({
    id: "Wood-to-Heat",
    inputs: [{ resource: "wood", amount: { base: 1, perBody: 0, multPerBody: 0 } }],
    outputs: [{ resource: "heat", amount: { base: 5, perBody: 0, multPerBody: 0 } }],
    resetCycle: false,
    conditions: [],
});

describe("conversionCompiler input gating", () => {
    it("adds has_input condition to sys_cycle_accumulate", () => {
        const draft = makeDraft();
        conversionCompiler(draft, makeConfig(), 0);

        const cycleRule = draft.components.behavior?.rules?.find(
            (r) => r.id === "sys_cycle_accumulate",
        );
        const inputCond = cycleRule?.conditions.find(
            (c) => c.id === "has_input_0",
        );
        expect(inputCond).toBeDefined();
        expect(inputCond?.tokens).toEqual([
            { t: "ref", v: "self.state.wood.value" },
            { t: "op", v: ">=" },
            {
                t: "ref",
                v: expect.stringContaining("self.state.vals_conv_in_wood"),
            },
        ]);
    });

    it("creates gate rule that zeroes all positive baseDemand attrs", () => {
        const draft = makeDraft();
        conversionCompiler(draft, makeConfig(), 0);

        const gateRule = draft.components.behavior?.rules?.find(
            (r) => r.id === "sys_conv_power_gate_0_0",
        );
        expect(gateRule).toBeDefined();
        expect(gateRule?.actions).toContainEqual(
            expect.objectContaining({
                type: "MUTATE",
                target: "self.powerSink.baseDemand.body",
                op: "SET",
                value: 0,
            }),
        );
        expect(gateRule?.actions).toContainEqual(
            expect.objectContaining({
                target: "self.powerSink.baseDemand.mind",
                value: 0,
            }),
        );
    });

    it("gate condition checks input below required amount", () => {
        const draft = makeDraft();
        conversionCompiler(draft, makeConfig(), 0);

        const gateRule = draft.components.behavior?.rules?.find(
            (r) => r.id === "sys_conv_power_gate_0_0",
        );
        const cond = gateRule?.conditions[0];
        expect(cond?.tokens[0]).toEqual({
            t: "ref",
            v: "self.state.wood.value",
        });
        expect(cond?.tokens[1]).toEqual({ t: "op", v: "<" });
    });

    it("does not create gate rules when no inputs defined", () => {
        const draft = makeDraft();
        conversionCompiler(draft, { ...makeConfig(), inputs: [] }, 0);

        const gateRule = draft.components.behavior?.rules?.find((r) =>
            r.id?.startsWith("sys_conv_power_gate"),
        );
        expect(gateRule).toBeUndefined();
    });

    it("does not add has_input to cycle rule when no inputs", () => {
        const draft = makeDraft();
        conversionCompiler(draft, { ...makeConfig(), inputs: [] }, 0);

        const cycleRule = draft.components.behavior?.rules?.find(
            (r) => r.id === "sys_cycle_accumulate",
        );
        expect(
            cycleRule?.conditions.find((c) => c.id === "has_input_0"),
        ).toBeUndefined();
    });
});
