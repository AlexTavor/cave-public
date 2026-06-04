import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { applyCycleConditionalActivation } from "./cycleConditionalActivation";
import {
    CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY,
    CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY,
} from "../../runtime/conditionalActivationState";
import type { CycleAbilityConfig } from "../../../data/schemas/abilities/cycle";
import type { ConditionalActivationAbilityValue } from "../../../data/schemas/abilities/conditionalActivation";

// A conditional-activation config that IS selected for the cycle ability AND has
// at least one condition -> getCycleConditionalActivationIndexes returns [0].
const cycleSelectedWithCondition: ConditionalActivationAbilityValue = {
    priority: 0,
    targets: [{ ability: "cycle" }],
    conditions: [
        {
            kind: "world_state_threshold",
            key: "heat",
            operator: ">=",
            value: 0,
        },
    ],
};

// For a single index [0], the active-state var is the un-suffixed key.
const ACTIVE_VAR = "self.state.conditional_activation_active.value";

const makeDraft = (extra?: Record<string, unknown>) =>
    createBlueprint("reactor", {
        components: {
            state: {},
            behavior: { rules: [] },
            ...extra,
        },
    });

const baseCycle: CycleAbilityConfig = {
    startActive: false,
} as CycleAbilityConfig;

describe("applyCycleConditionalActivation", () => {
    it("does nothing when no cycle-selected conditional-activation config exists", () => {
        const draft = makeDraft();

        applyCycleConditionalActivation(draft, baseCycle, undefined);

        // Both gates are null -> early return, no state/behavior mutation.
        expect(draft.components.state).toEqual({});
        expect(draft.components.behavior?.rules).toEqual([]);
    });

    it("does nothing when the config targets cycle but has no conditions", () => {
        const draft = makeDraft();

        applyCycleConditionalActivation(draft, baseCycle, {
            priority: 0,
            targets: [{ ability: "cycle" }],
            conditions: [],
        });

        expect(draft.components.state).toEqual({});
        expect(draft.components.behavior?.rules).toEqual([]);
    });

    it("does nothing when the config has conditions but does not target cycle", () => {
        const draft = makeDraft();

        applyCycleConditionalActivation(draft, baseCycle, {
            priority: 0,
            targets: [{ ability: "assignment" }],
            conditions: [
                {
                    kind: "world_state_threshold",
                    key: "heat",
                    operator: ">=",
                    value: 0,
                },
            ],
        });

        expect(draft.components.state).toEqual({});
        expect(draft.components.behavior?.rules).toEqual([]);
    });

    it("writes the three activation state entries (startActive:false -> saved throttle 0)", () => {
        const draft = makeDraft();

        applyCycleConditionalActivation(
            draft,
            { startActive: false } as CycleAbilityConfig,
            cycleSelectedWithCondition,
        );

        expect(draft.components.state).toEqual({
            cycle_active: { value: 0, visible: false },
            [CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY]: {
                value: 0,
                visible: false,
            },
            [CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY]: {
                value: 1,
                visible: false,
            },
        });
    });

    it("seeds the saved throttle to 1 when startActive is true", () => {
        const draft = makeDraft();

        applyCycleConditionalActivation(
            draft,
            { startActive: true } as CycleAbilityConfig,
            cycleSelectedWithCondition,
        );

        expect(
            draft.components.state?.[
                CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY
            ],
        ).toEqual({ value: 1, visible: false });
    });

    it("appends the full ON and OFF activation rules (deep-equal)", () => {
        const draft = makeDraft();

        applyCycleConditionalActivation(
            draft,
            baseCycle,
            cycleSelectedWithCondition,
        );

        expect(draft.components.behavior?.rules).toEqual([
            {
                id: "sys_conditional_activation_cycle_on",
                sortKey: "sys_002",
                conditions: [
                    {
                        id: "conditional_activation_cycle_on",
                        sortKey: "conditional_activation_cycle_on",
                        tokens: [],
                        compiled: { var: ACTIVE_VAR },
                    },
                ],
                actions: [
                    {
                        type: "MUTATE",
                        target: "self.state.cycle_active.value",
                        op: "SET",
                        value: 1,
                    },
                    {
                        type: "MUTATE",
                        target: "self.powerSink.throttle",
                        op: "SET",
                        value: `self.state.${CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY}.value`,
                    },
                    {
                        type: "MUTATE",
                        target: `self.state.${CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY}.value`,
                        op: "SET",
                        value: 0,
                    },
                ],
            },
            {
                id: "sys_conditional_activation_cycle_off",
                sortKey: "sys_003",
                conditions: [
                    {
                        id: "conditional_activation_cycle_off",
                        sortKey: "conditional_activation_cycle_off",
                        tokens: [],
                        compiled: { "!": [{ var: ACTIVE_VAR }] },
                    },
                ],
                actions: [
                    {
                        type: "MUTATE",
                        target: "self.state.cycle_active.value",
                        op: "SET",
                        value: 0,
                    },
                    {
                        type: "MUTATE",
                        target: "self.powerSink.throttle",
                        op: "SET",
                        value: 0,
                    },
                    {
                        type: "MUTATE",
                        target: `self.state.${CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY}.value`,
                        op: "SET",
                        value: 1,
                    },
                ],
            },
        ]);
    });

    it("preserves pre-existing behavior rules and appends after them", () => {
        const existing = {
            id: "sys_pre_existing",
            sortKey: "sys_001",
            conditions: [],
            actions: [],
        };
        const draft = makeDraft({ behavior: { rules: [existing] } });

        applyCycleConditionalActivation(
            draft,
            baseCycle,
            cycleSelectedWithCondition,
        );

        const ids = draft.components.behavior?.rules?.map((r) => r.id);
        expect(ids).toEqual([
            "sys_pre_existing",
            "sys_conditional_activation_cycle_on",
            "sys_conditional_activation_cycle_off",
        ]);
    });

    it("zeroes an existing powerSink throttle when activation gating applies", () => {
        const draft = makeDraft({ powerSink: { throttle: 7 } });

        applyCycleConditionalActivation(
            draft,
            baseCycle,
            cycleSelectedWithCondition,
        );

        expect(draft.components.powerSink?.throttle).toBe(0);
    });

    it("does not fail and adds rules when no powerSink component is present", () => {
        const draft = makeDraft();
        expect(draft.components.powerSink).toBeUndefined();

        applyCycleConditionalActivation(
            draft,
            baseCycle,
            cycleSelectedWithCondition,
        );

        // No powerSink was created by the compiler; rules still landed.
        expect(draft.components.powerSink).toBeUndefined();
        expect(draft.components.behavior?.rules).toHaveLength(2);
    });

    it("tolerates a draft with no behavior component (rules fallback to [])", () => {
        // behavior is absent: behavior?.rules must safely fall back to [] rather
        // than throwing, while state is still written onto the draft.
        const draft = createBlueprint("reactor", { components: { state: {} } });
        expect(draft.components.behavior).toBeUndefined();

        applyCycleConditionalActivation(
            draft,
            baseCycle,
            cycleSelectedWithCondition,
        );

        // No throw; the state entries are written even though behavior was absent.
        expect(draft.components.state?.cycle_active).toEqual({
            value: 0,
            visible: false,
        });
    });
});
