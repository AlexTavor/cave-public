import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import type { Blueprint } from "../../../data/schemas/blueprint";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import {
    ensureStateEntry,
    removeCycleResetRule,
    createConversionRule,
    addInputConditionsToCycleRule,
} from "./conversionCompilerUtils";

const IRON_INPUT = {
    resource: "iron",
    amountRef: "self.state.vals_conv_in_iron_0_0.value",
};
const COAL_INPUT = {
    resource: "coal",
    amountRef: "self.state.vals_conv_in_coal_0_1.value",
};
const STEEL_OUTPUT = {
    resource: "steel",
    amountRef: "self.state.vals_conv_out_steel_0_0.value",
    target: "self",
};
const SLAG_OUTPUT = {
    resource: "slag",
    amountRef: "self.state.vals_conv_out_slag_0_1.value",
    target: "sys_world",
};

describe("ensureStateEntry", () => {
    it("creates the state map and a default entry when absent", () => {
        const draft = createBlueprint("e", { components: {} });
        ensureStateEntry(draft, "iron");
        expect(draft.components.state).toEqual({
            iron: { value: 0, visible: false },
        });
    });

    it("does not overwrite an existing entry", () => {
        const draft = createBlueprint("e", {
            components: { state: { iron: { value: 7, visible: true } } },
        });
        ensureStateEntry(draft, "iron");
        expect(draft.components.state?.iron).toEqual({
            value: 7,
            visible: true,
        });
    });
});

describe("removeCycleResetRule", () => {
    it("removes only the sys_cycle_reset rule, leaving the rest in order", () => {
        const keep1: BehaviorRule = {
            id: "keep_a",
            sortKey: "sys_010",
            conditions: [],
            actions: [],
        };
        const reset: BehaviorRule = {
            id: "sys_cycle_reset",
            sortKey: "sys_020",
            conditions: [],
            actions: [],
        };
        const keep2: BehaviorRule = {
            id: "keep_b",
            sortKey: "sys_030",
            conditions: [],
            actions: [],
        };
        const draft = createBlueprint("e", {
            components: { behavior: { rules: [keep1, reset, keep2] } },
        });

        removeCycleResetRule(draft);

        expect(draft.components.behavior?.rules).toEqual([keep1, keep2]);
    });

    it("is a no-op when there is no behavior component", () => {
        const draft = createBlueprint("e", { components: {} });
        removeCycleResetRule(draft);
        expect(draft.components.behavior).toBeUndefined();
    });

    it("is a no-op when behavior exists but has no rules array", () => {
        const draft = {
            id: "e",
            label: "e",
            tags: [],
            components: { behavior: {} },
        } as unknown as Blueprint;
        removeCycleResetRule(draft);
        expect(draft.components?.behavior).toEqual({});
    });
});

describe("createConversionRule", () => {
    it("builds the full rule: cycle conditions + per-input has_input conditions, SUB/ADD/TRANSFER/reset actions", () => {
        const rule = createConversionRule({
            id: "smelt",
            index: 0,
            inputRefs: [IRON_INPUT, COAL_INPUT],
            outputRefs: [STEEL_OUTPUT, SLAG_OUTPUT],
            resetCycle: true,
            triggers: ["cycle_complete"],
        });

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
                        {
                            t: "ref",
                            v: "self.state.vals_conv_in_iron_0_0.value",
                        },
                    ],
                },
                {
                    id: "has_input_1",
                    sortKey: "1_1",
                    tokens: [
                        { t: "ref", v: "self.state.coal.value" },
                        { t: "op", v: ">=" },
                        {
                            t: "ref",
                            v: "self.state.vals_conv_in_coal_0_1.value",
                        },
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
                    target: "self.state.coal.value",
                    op: "SUB",
                    value: "self.state.vals_conv_in_coal_0_1.value",
                },
                {
                    type: "MUTATE",
                    target: "self.state.steel.value",
                    op: "ADD",
                    value: "self.state.vals_conv_out_steel_0_0.value",
                },
                {
                    type: "MUTATE",
                    target: "self.state.slag.value",
                    op: "ADD",
                    value: "self.state.vals_conv_out_slag_0_1.value",
                },
                {
                    type: "TRANSFER",
                    source: "self",
                    target: "sys_world",
                    resource: "slag",
                    amount: "self.state.vals_conv_out_slag_0_1.value",
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

    it("omits the reset action when resetCycle is false and emits no TRANSFER for self-targeted outputs", () => {
        const rule = createConversionRule({
            id: "smelt",
            index: 3,
            inputRefs: [IRON_INPUT],
            outputRefs: [STEEL_OUTPUT],
            resetCycle: false,
            triggers: ["cycle_complete"],
        });

        expect(rule).toEqual({
            id: "sys_convert_smelt_3",
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
                        {
                            t: "ref",
                            v: "self.state.vals_conv_in_iron_0_0.value",
                        },
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
            ],
        });
    });

    it("uses the assignment_complete condition (not cycle) and no input conditions when there are no inputs", () => {
        const rule = createConversionRule({
            id: "default",
            index: 0,
            inputRefs: [],
            outputRefs: [STEEL_OUTPUT],
            resetCycle: true,
            triggers: ["assignment_complete"],
        });

        expect(rule.conditions).toEqual([
            {
                id: "assignment_complete",
                sortKey: "0",
                tokens: [],
                compiled: {
                    ">": [
                        { var: "self.state.assignment_complete_pulse.value" },
                        0,
                    ],
                },
            },
        ]);
        expect(rule.actions).toEqual([
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
        ]);
    });
});

describe("addInputConditionsToCycleRule", () => {
    it("appends a has_input condition per input to the sys_cycle_accumulate rule", () => {
        const accumulate: BehaviorRule = {
            id: "sys_cycle_accumulate",
            sortKey: "sys_005",
            conditions: [
                { id: "existing", sortKey: "0", tokens: [] },
            ],
            actions: [],
        };
        const draft = createBlueprint("e", {
            components: { behavior: { rules: [accumulate] } },
        });

        addInputConditionsToCycleRule(draft, [IRON_INPUT, COAL_INPUT]);

        const rule = draft.components.behavior?.rules?.find(
            (r) => r.id === "sys_cycle_accumulate",
        );
        expect(rule?.conditions).toEqual([
            { id: "existing", sortKey: "0", tokens: [] },
            {
                id: "has_input_0",
                sortKey: "1",
                tokens: [
                    { t: "ref", v: "self.state.iron.value" },
                    { t: "op", v: ">=" },
                    { t: "ref", v: "self.state.vals_conv_in_iron_0_0.value" },
                ],
            },
            {
                id: "has_input_1",
                sortKey: "2",
                tokens: [
                    { t: "ref", v: "self.state.coal.value" },
                    { t: "op", v: ">=" },
                    { t: "ref", v: "self.state.vals_conv_in_coal_0_1.value" },
                ],
            },
        ]);
    });

    it("is a no-op when no sys_cycle_accumulate rule is present", () => {
        const other: BehaviorRule = {
            id: "sys_other",
            sortKey: "sys_005",
            conditions: [],
            actions: [],
        };
        const draft = createBlueprint("e", {
            components: { behavior: { rules: [other] } },
        });

        addInputConditionsToCycleRule(draft, [IRON_INPUT]);

        expect(draft.components.behavior?.rules).toEqual([other]);
    });

    it("is a no-op when there is no behavior component at all", () => {
        const draft = createBlueprint("e", { components: {} });
        addInputConditionsToCycleRule(draft, [IRON_INPUT]);
        expect(draft.components.behavior).toBeUndefined();
    });
});
