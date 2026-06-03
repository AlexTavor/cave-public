import { describe, expect, it, vi } from "vitest";
import { createBlueprint } from "../../test/factories";
import type { Blueprint } from "../../../data/schemas/blueprint";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import { Op } from "../../../data/schemas/primitives";
import { conversionCompiler } from "./conversionCompiler";

const makeDraft = () =>
    createBlueprint("smelter", {
        components: {
            state: {
                cycle: { value: 0, max: 10, visible: false },
                iron: { value: 5, visible: false },
                coal: { value: 5, visible: false },
                steel: { value: 0, visible: false },
            },
        },
    });

const findConversionRule = (draft: Blueprint, id: string) =>
    draft.components.behavior?.rules?.find((entry) => entry.id === id);

describe("conversionCompiler", () => {
    it("builds the full conversion rule (conditions + actions) for a single in/out with reset", () => {
        const draft = makeDraft();

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [
                    { resource: "iron", amount: { base: 2, perBody: 0, multPerBody: 0 } },
                ],
                outputs: [
                    { resource: "steel", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                resetCycle: true,
                conditions: [],
            },
            0,
        );

        const rule = findConversionRule(draft, "sys_convert_smelt_0");
        expect(rule).toEqual({
            id: "sys_convert_smelt_0",
            sortKey: "sys_060",
            conditions: [
                {
                    id: "cycle_complete",
                    sortKey: "0",
                    tokens: [
                        { t: "ref", v: "self.state.cycle.value" },
                        { t: "op", v: ">=" },
                        { t: "ref", v: "self.state.cycle.max" },
                    ],
                },
                {
                    id: "cycle_has_max",
                    sortKey: "1",
                    tokens: [
                        { t: "ref", v: "self.state.cycle.max" },
                        { t: "op", v: ">" },
                        { t: "val", v: 0 },
                    ],
                },
                {
                    id: "has_input_0",
                    sortKey: "1_0",
                    tokens: [
                        { t: "ref", v: "self.state.iron.value" },
                        { t: "op", v: ">=" },
                        { t: "ref", v: "self.state.vals_conv_in_iron_0_0.value" },
                    ],
                },
            ],
            actions: [
                {
                    type: "MUTATE",
                    target: "self.state.iron.value",
                    op: "SUB",
                    value: "self.state.vals_conv_in_iron_0_0.value",
                },
                {
                    type: "MUTATE",
                    target: "self.state.steel.value",
                    op: "ADD",
                    value: "self.state.vals_conv_out_steel_0_0.value",
                },
                {
                    type: "MUTATE",
                    target: "self.state.cycle.value",
                    op: "SET",
                    value: 0,
                },
            ],
        });
    });

    it("appends a TRANSFER action for a non-self output target", () => {
        const draft = makeDraft();

        conversionCompiler(
            draft,
            {
                id: "ship",
                inputs: [],
                outputs: [
                    {
                        resource: "steel",
                        amount: { base: 1, perBody: 0, multPerBody: 0 },
                        target: "sys_world",
                    },
                ],
                resetCycle: true,
                conditions: [],
            },
            0,
        );

        const rule = findConversionRule(draft, "sys_convert_ship_0");
        expect(rule?.actions).toEqual([
            {
                type: "MUTATE",
                target: "self.state.steel.value",
                op: "ADD",
                value: "self.state.vals_conv_out_steel_0_0.value",
            },
            {
                type: "TRANSFER",
                source: "self",
                target: "sys_world",
                resource: "steel",
                amount: "self.state.vals_conv_out_steel_0_0.value",
            },
            {
                type: "MUTATE",
                target: "self.state.cycle.value",
                op: "SET",
                value: 0,
            },
        ]);
    });

    it("defaults a blank output target to 'self' (no TRANSFER emitted)", () => {
        const draft = makeDraft();

        conversionCompiler(
            draft,
            {
                id: "blank",
                inputs: [],
                outputs: [
                    {
                        resource: "steel",
                        amount: { base: 1, perBody: 0, multPerBody: 0 },
                        target: "   ",
                    },
                ],
                resetCycle: false,
                conditions: [],
            },
            0,
        );

        const rule = findConversionRule(draft, "sys_convert_blank_0");
        expect(
            rule?.actions.some((a) => a.type === "TRANSFER"),
        ).toBe(false);
    });

    it("omits the cycle-reset action when resetCycle is false", () => {
        const draft = makeDraft();

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [
                    { resource: "iron", amount: { base: 2, perBody: 0, multPerBody: 0 } },
                ],
                outputs: [
                    { resource: "steel", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                resetCycle: false,
                conditions: [],
            },
            0,
        );

        const rule = findConversionRule(draft, "sys_convert_smelt_0");
        expect(
            rule?.actions.some(
                (a) => a.type === "MUTATE" && a.target === "self.state.cycle.value",
            ),
        ).toBe(false);
        // resetCycle:false must NOT add a TRANSFER or extra reset; just SUB + ADD.
        expect(rule?.actions).toHaveLength(2);
    });

    it("defaults the rule id to 'default' when config.id is missing/blank", () => {
        const draft = makeDraft();

        conversionCompiler(
            draft,
            {
                id: "  ",
                inputs: [
                    { resource: "iron", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                outputs: [],
                resetCycle: true,
                conditions: [],
            },
            4,
        );

        expect(findConversionRule(draft, "sys_convert_default_4")).toBeDefined();
    });

    it("uses the index in the rule id", () => {
        const draft = makeDraft();

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [],
                outputs: [
                    { resource: "steel", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                resetCycle: true,
                conditions: [],
            },
            7,
        );

        expect(findConversionRule(draft, "sys_convert_smelt_7")).toBeDefined();
        expect(findConversionRule(draft, "sys_convert_smelt_0")).toBeUndefined();
    });

    it("warns and skips an input whose resource is blank", () => {
        const draft = makeDraft();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [
                    { resource: "   ", amount: { base: 2, perBody: 0, multPerBody: 0 } },
                    { resource: "iron", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                outputs: [],
                resetCycle: true,
                conditions: [],
            },
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            "Conversion input missing resource on 'smelter'.",
        );

        const rule = findConversionRule(draft, "sys_convert_smelt_0");
        // Only the valid 'iron' input survives -> exactly one has_input condition.
        const inputConds = rule?.conditions.filter((c) =>
            c.id.startsWith("has_input_"),
        );
        expect(inputConds).toEqual([
            {
                id: "has_input_0",
                sortKey: "1_0",
                tokens: [
                    { t: "ref", v: "self.state.iron.value" },
                    { t: "op", v: ">=" },
                    { t: "ref", v: "self.state.vals_conv_in_iron_0_1.value" },
                ],
            },
        ]);
        warn.mockRestore();
    });

    it("warns and skips an output whose resource is blank", () => {
        const draft = makeDraft();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [],
                outputs: [
                    { resource: "", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                    { resource: "steel", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                resetCycle: true,
                conditions: [],
            },
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            "Conversion output missing resource on 'smelter'.",
        );

        const rule = findConversionRule(draft, "sys_convert_smelt_0");
        const addActions = rule?.actions.filter(
            (a) => a.type === "MUTATE" && a.op === "ADD",
        );
        // Only 'steel' produced; the blank output is skipped. forEach keeps the
        // original index, so steel (at outputs[1]) uses outputIndex 1.
        expect(addActions).toEqual([
            {
                type: "MUTATE",
                target: "self.state.steel.value",
                op: "ADD",
                value: "self.state.vals_conv_out_steel_0_1.value",
            },
        ]);
        warn.mockRestore();
    });

    it("warns about a missing cycle when a cycle trigger is required", () => {
        const draft = createBlueprint("nocycle", { components: { state: {} } });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [
                    { resource: "iron", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                outputs: [],
                resetCycle: true,
                triggers: ["cycle_complete"],
                conditions: [],
            },
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            "Conversion ability requires cycle on 'nocycle'.",
        );
        warn.mockRestore();
    });

    it("does NOT warn about a missing cycle when the trigger is assignment-only", () => {
        const draft = createBlueprint("nocycle", { components: { state: {} } });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [
                    { resource: "iron", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                outputs: [],
                resetCycle: true,
                triggers: ["assignment_complete"],
                conditions: [],
            },
            0,
        );

        expect(warn).not.toHaveBeenCalledWith(
            "Conversion ability requires cycle on 'nocycle'.",
        );
        warn.mockRestore();
    });

    it("does NOT warn when a cycle trigger is required and the cycle is present", () => {
        const draft = makeDraft();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [
                    { resource: "iron", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                outputs: [],
                resetCycle: true,
                triggers: ["cycle_complete"],
                conditions: [],
            },
            0,
        );

        expect(warn).not.toHaveBeenCalledWith(
            "Conversion ability requires cycle on 'smelter'.",
        );
        warn.mockRestore();
    });

    it("does nothing (no behavior rules) when both inputs and outputs are empty", () => {
        const draft = makeDraft();

        conversionCompiler(
            draft,
            {
                id: "noop",
                inputs: [],
                outputs: [],
                resetCycle: true,
                conditions: [],
            },
            0,
        );

        expect(draft.components.behavior).toBeUndefined();
    });

    it("treats undefined inputs/outputs as empty and produces no rule", () => {
        const draft = makeDraft();

        conversionCompiler(
            draft,
            {
                id: "noop",
                resetCycle: true,
                conditions: [],
            } as never,
            0,
        );

        expect(draft.components.behavior).toBeUndefined();
    });

    it("removes the sys_cycle_reset rule when resetCycle is false", () => {
        const resetRule: BehaviorRule = {
            id: "sys_cycle_reset",
            sortKey: "sys_050",
            conditions: [],
            actions: [],
        };
        const draft = createBlueprint("smelter", {
            components: {
                state: { cycle: { value: 0, max: 10, visible: false } },
                behavior: { rules: [resetRule] },
            },
        });

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [],
                outputs: [
                    { resource: "steel", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                resetCycle: false,
                conditions: [],
            },
            0,
        );

        expect(
            draft.components.behavior?.rules?.some(
                (r) => r.id === "sys_cycle_reset",
            ),
        ).toBe(false);
    });

    it("does NOT remove the sys_cycle_reset rule when resetCycle is true (default)", () => {
        const resetRule: BehaviorRule = {
            id: "sys_cycle_reset",
            sortKey: "sys_050",
            conditions: [],
            actions: [],
        };
        const draft = createBlueprint("smelter", {
            components: {
                state: { cycle: { value: 0, max: 10, visible: false } },
                behavior: { rules: [resetRule] },
            },
        });

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [],
                outputs: [
                    { resource: "steel", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                resetCycle: true,
                conditions: [],
            },
            0,
        );

        expect(
            draft.components.behavior?.rules?.some(
                (r) => r.id === "sys_cycle_reset",
            ),
        ).toBe(true);
    });

    it("adds input-presence conditions to an existing sys_cycle_accumulate rule", () => {
        const accumulate: BehaviorRule = {
            id: "sys_cycle_accumulate",
            sortKey: "sys_005",
            conditions: [],
            actions: [],
        };
        const draft = createBlueprint("smelter", {
            components: {
                state: {
                    cycle: { value: 0, max: 10, visible: false },
                    iron: { value: 5, visible: false },
                },
                behavior: { rules: [accumulate] },
            },
        });

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [
                    { resource: "iron", amount: { base: 2, perBody: 0, multPerBody: 0 } },
                ],
                outputs: [],
                resetCycle: true,
                conditions: [],
            },
            0,
        );

        const accRule = draft.components.behavior?.rules?.find(
            (r) => r.id === "sys_cycle_accumulate",
        );
        expect(accRule?.conditions).toEqual([
            {
                id: "has_input_0",
                sortKey: "1",
                tokens: [
                    { t: "ref", v: "self.state.iron.value" },
                    { t: "op", v: ">=" },
                    { t: "ref", v: "self.state.vals_conv_in_iron_0_0.value" },
                ],
            },
        ]);
    });

    it("emits a power-gate rule per input when a baseDemand passive effect is present", () => {
        const draft = createBlueprint("smelter", {
            components: {
                state: {
                    cycle: { value: 0, max: 10, visible: false },
                    iron: { value: 5, visible: false },
                },
                passiveEffects: [
                    {
                        op: Op.SET,
                        target: "self.powerSink.baseDemand.heat",
                        value: 5,
                    },
                ],
            },
        });

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [
                    { resource: "iron", amount: { base: 2, perBody: 0, multPerBody: 0 } },
                ],
                outputs: [],
                resetCycle: true,
                conditions: [],
            },
            3,
        );

        const gate = draft.components.behavior?.rules?.find(
            (r) => r.id === "sys_conv_power_gate_3_0",
        );
        expect(gate).toEqual({
            id: "sys_conv_power_gate_3_0",
            sortKey: "sys_000",
            conditions: [
                {
                    id: "no_input",
                    sortKey: "0",
                    tokens: [
                        { t: "ref", v: "self.state.iron.value" },
                        { t: "op", v: "<" },
                        { t: "ref", v: "self.state.vals_conv_in_iron_3_0.value" },
                    ],
                },
            ],
            actions: [
                {
                    type: "MUTATE",
                    target: "self.powerSink.baseDemand.heat",
                    op: "SET",
                    value: 0,
                },
            ],
        });
    });

    it("appends authored gate conditions from config.conditions to the conversion rule", () => {
        const draft = makeDraft();

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [],
                outputs: [
                    { resource: "steel", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                resetCycle: true,
                conditions: ["self.state.iron.value > 0"],
            },
            0,
        );

        const rule = findConversionRule(draft, "sys_convert_smelt_0");
        expect(
            rule?.conditions.some((c) => c.id === "gate_sys_convert_smelt_0_0"),
        ).toBe(true);
    });
});
