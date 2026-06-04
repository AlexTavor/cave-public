import { describe, expect, it, vi } from "vitest";
import { createBlueprint } from "../../test/factories";
import type { Blueprint } from "../../../data/schemas/blueprint";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import type { ConversionAbilityConfig } from "../../../data/schemas/abilities/conversion";
import { Op } from "../../../data/schemas/primitives";
import { conversionCompiler } from "./conversionCompiler";

// A conversion input/output whose `resource` is genuinely absent (not just
// blank). The schema input type requires `resource: string`, so we describe the
// missing-resource shape with an explicit partial type rather than `any`.
type ConversionInput = ConversionAbilityConfig["inputs"] extends
    | Array<infer T>
    | undefined
    ? T
    : never;
type ConversionOutput = ConversionAbilityConfig["outputs"] extends
    | Array<infer T>
    | undefined
    ? T
    : never;
const inputWithoutResource: ConversionInput = {
    amount: { base: 1, perBody: 0, multPerBody: 0 },
} as ConversionInput;
const outputWithoutResource: ConversionOutput = {
    amount: { base: 1, perBody: 0, multPerBody: 0 },
} as ConversionOutput;

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

    // --- residual mutation survivors -------------------------------------

    it("defaults absent triggers to ['cycle_complete'] (warns on a missing cycle)", () => {
        // Omitting `triggers` must fall back to ["cycle_complete"], which makes
        // requiresCycleTrigger true and warns when the cycle state is absent.
        // Mutating the default to [] or [""] would silence this warning.
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
                // triggers intentionally omitted
                conditions: [],
            },
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            "Conversion ability requires cycle on 'nocycle'.",
        );
        warn.mockRestore();
    });

    it("defaults absent triggers to the cycle_complete conditions on the rule", () => {
        // Second observation of the L24 default: the produced rule carries the
        // two cycle_complete conditions, fixing the literal's content/shape.
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
                // triggers intentionally omitted
                conditions: [],
            },
            0,
        );

        const rule = findConversionRule(draft, "sys_convert_smelt_0");
        expect(rule?.conditions).toEqual([
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
        ]);
    });

    it("does NOT warn about a missing cycle when components has no state at all", () => {
        // Exercises `draft.components?.state?.cycle` with components present but
        // state absent: the inner `?.state` short-circuit must hold (no throw),
        // and the cycle is still considered missing -> warn fires.
        const draft = createBlueprint("nostate", {});
        // Strip the state object entirely while keeping components defined.
        delete (draft.components as { state?: unknown }).state;
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
            "Conversion ability requires cycle on 'nostate'.",
        );
        warn.mockRestore();
    });

    it("warns about a missing cycle when the whole components object is absent", () => {
        // Exercises the outer `draft.components?.` optional chain: components is
        // undefined, so the chain short-circuits to undefined and the cycle is
        // treated as missing.
        const draft = createBlueprint("nocomps", {});
        delete (draft as { components?: unknown }).components;
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
            "Conversion ability requires cycle on 'nocomps'.",
        );
        warn.mockRestore();
    });

    it("treats undefined inputs as the empty array (no input conditions emitted)", () => {
        // `(config.inputs ?? [])` — when inputs is omitted the fallback must be
        // an empty array; a non-empty Stryker fallback would inject a bogus
        // input. Outputs alone still produce a rule with NO has_input condition,
        // and crucially NO "missing resource" warning (an injected string item
        // would be resource-less and trip that warn).
        const draft = makeDraft();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        conversionCompiler(
            draft,
            {
                id: "smelt",
                outputs: [
                    { resource: "steel", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                resetCycle: true,
                conditions: [],
            } as ConversionAbilityConfig,
            0,
        );

        const rule = findConversionRule(draft, "sys_convert_smelt_0");
        expect(
            rule?.conditions.some((c) => c.id.startsWith("has_input_")),
        ).toBe(false);
        // No SUB action either: inputs really were empty.
        expect(
            rule?.actions.some((a) => a.type === "MUTATE" && a.op === "SUB"),
        ).toBe(false);
        // The empty-array default means forEach never runs -> no input warning.
        expect(warn).not.toHaveBeenCalledWith(
            "Conversion input missing resource on 'smelter'.",
        );
        warn.mockRestore();
    });

    it("treats undefined outputs as the empty array (no ADD action emitted)", () => {
        // `(config.outputs ?? [])` — inputs alone still produce a rule, and no
        // output ADD/TRANSFER action appears, nor any "missing resource" warning
        // (an injected string item would be resource-less and trip that warn).
        const draft = makeDraft();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [
                    { resource: "iron", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                resetCycle: true,
                conditions: [],
            } as ConversionAbilityConfig,
            0,
        );

        const rule = findConversionRule(draft, "sys_convert_smelt_0");
        expect(
            rule?.actions.some((a) => a.type === "MUTATE" && a.op === "ADD"),
        ).toBe(false);
        expect(rule?.actions.some((a) => a.type === "TRANSFER")).toBe(false);
        // The single input SUB is present, proving inputs were processed.
        expect(
            rule?.actions.some((a) => a.type === "MUTATE" && a.op === "SUB"),
        ).toBe(true);
        // The empty-array default means forEach never runs -> no output warning.
        expect(warn).not.toHaveBeenCalledWith(
            "Conversion output missing resource on 'smelter'.",
        );
        warn.mockRestore();
    });

    it("warns and skips an input whose resource is entirely absent (optional-chain)", () => {
        // `input.resource?.trim()` with resource === undefined: the chain must
        // short-circuit (no throw) and the input is skipped with a warning.
        const draft = makeDraft();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [
                    inputWithoutResource,
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
        const inputConds = rule?.conditions.filter((c) =>
            c.id.startsWith("has_input_"),
        );
        expect(inputConds).toHaveLength(1);
        warn.mockRestore();
    });

    it("warns and skips an output whose resource is entirely absent (optional-chain + trim)", () => {
        // `output.resource?.trim()` with resource === undefined: the optional
        // chain short-circuits and the `.trim()` method call is genuinely
        // exercised on the surviving 'steel' output (MethodExpression guard).
        const draft = makeDraft();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [],
                outputs: [
                    outputWithoutResource,
                    {
                        resource: "  steel  ",
                        amount: { base: 1, perBody: 0, multPerBody: 0 },
                    },
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
        // The surviving output's resource was trimmed to "steel" (not "  steel  ").
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

    it("creates behavior as { rules: [...] } when components has no behavior yet", () => {
        // `draft.components.behavior ??= { rules: [] }` (L82): with no prior
        // behavior, the object literal AND its rules array must be created.
        const draft = makeDraft();
        expect(draft.components.behavior).toBeUndefined();

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

        // Exactly one rule (the conversion rule) lives in a real array.
        expect(Array.isArray(draft.components.behavior?.rules)).toBe(true);
        expect(draft.components.behavior?.rules?.map((r) => r.id)).toEqual([
            "sys_convert_smelt_0",
        ]);
    });

    it("reuses an existing behavior object missing its rules array (??= []) ", () => {
        // L83 `draft.components.behavior.rules ??= []` is only reached when a
        // behavior object exists WITHOUT a rules array. The new conversion rule
        // must seed that array.
        const draft = makeDraft();
        draft.components.behavior = {} as Blueprint["components"]["behavior"];

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

        expect(draft.components.behavior?.rules?.map((r) => r.id)).toEqual([
            "sys_convert_smelt_0",
        ]);
    });

    it("adds input gating only when inputRefs is non-empty (L85 true branch)", () => {
        // `if (inputRefs.length > 0)` true branch: with a power baseDemand
        // present, a power-gate rule is emitted per input. This also fixes the
        // EqualityOperator (>0 vs >=0 differ only at 0, covered by the next test).
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
                    { resource: "iron", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                outputs: [],
                resetCycle: true,
                conditions: [],
            },
            0,
        );

        expect(
            draft.components.behavior?.rules?.some(
                (r) => r.id === "sys_conv_power_gate_0_0",
            ),
        ).toBe(true);
    });

    it("does NOT add input gating when there are zero inputs (L85 false branch)", () => {
        // With zero inputs, the L85 guard must be false. A >=0 mutant would make
        // it true and try to build a (spurious) power-gate rule. The presence of
        // a baseDemand effect makes that spurious rule observable if it appears.
        const draft = createBlueprint("smelter", {
            components: {
                state: {
                    cycle: { value: 0, max: 10, visible: false },
                    steel: { value: 0, visible: false },
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
            draft.components.behavior?.rules?.some((r) =>
                r.id.startsWith("sys_conv_power_gate_"),
            ),
        ).toBe(false);
        // And no has_input condition leaked onto the conversion rule.
        const rule = findConversionRule(draft, "sys_convert_smelt_0");
        expect(
            rule?.conditions.some((c) => c.id.startsWith("has_input_")),
        ).toBe(false);
    });

    it("defaults the rule id to 'default' when config.id is entirely absent (optional-chain)", () => {
        // `config.id?.trim()` with id === undefined: the optional chain must
        // short-circuit to undefined, so the `|| "default"` fallback applies.
        const draft = makeDraft();

        conversionCompiler(
            draft,
            {
                inputs: [],
                outputs: [
                    { resource: "steel", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                resetCycle: true,
                conditions: [],
            } as ConversionAbilityConfig,
            2,
        );

        expect(findConversionRule(draft, "sys_convert_default_2")).toBeDefined();
    });

    it("uses the '<id>:conversion' context label when an authored condition fails to compile", () => {
        // L99: appendRuleConditions receives `${draft.id}:conversion` as the
        // context label, surfaced verbatim in the warning for a malformed
        // condition. An empty-string label mutant would drop the prefix.
        const draft = makeDraft();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [],
                outputs: [
                    { resource: "steel", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                resetCycle: true,
                // 5 parts -> compileConditionText fails -> warn with context.
                conditions: ["self.state.iron.value too many parts"],
            },
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("Condition error in smelter:conversion:"),
        );
        warn.mockRestore();
    });
});
