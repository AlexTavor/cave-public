import { describe, expect, it, vi } from "vitest";
import {
    compileConditionalActivationConfig,
    validateConditionalActivationTargets,
} from "./compileConfig";
import { createBlueprint } from "../../../test/factories";
import type { Blueprint } from "../../../../data/schemas/blueprint";
import type {
    ConditionalActivationAbilityConfig,
    ConditionalActivationTarget,
} from "../../../../data/schemas/abilities/conditionalActivation";

// A single structured condition -> compileStructuredConditionAllGate returns the
// bare compiled expression (no `and` wrapper).
const oneCondition: NonNullable<
    ConditionalActivationAbilityConfig["conditions"]
> = [{ kind: "world_state_threshold", key: "food", operator: ">=", value: 1 }];

const makeConfig = (
    overrides: Partial<ConditionalActivationAbilityConfig> = {},
): ConditionalActivationAbilityConfig => ({
    conditions: oneCondition,
    targets: [],
    ...overrides,
});

describe("compileConditionalActivationConfig", () => {
    it("emits the active state entry and both on/off rules (index 0, no suffix)", () => {
        const draft = createBlueprint("bp", { components: {} });

        compileConditionalActivationConfig(draft, makeConfig(), 0);

        // Hidden active state, exact shape.
        expect(
            draft.components.state?.conditional_activation_active,
        ).toEqual({ value: 0, visible: false });

        const rules = draft.components.behavior?.rules ?? [];
        expect(rules).toHaveLength(2);

        // ON rule: full structure (id, sortKey, action target/op/value) +
        // the compiled gate (single condition -> bare expression).
        const onRule = rules.find(
            (r) => r.id === "sys_conditional_activation_on",
        );
        expect(onRule).toMatchObject({
            id: "sys_conditional_activation_on",
            sortKey: "sys_001",
            actions: [
                {
                    type: "MUTATE",
                    target: "self.state.conditional_activation_active.value",
                    op: "SET",
                    value: 1,
                },
            ],
        });
        expect(onRule?.conditions[0]?.compiled).toEqual({
            ">=": [{ var: "sys_world.state.food.value" }, 1],
        });

        // OFF rule: SET value 0 + negated gate.
        const offRule = rules.find(
            (r) => r.id === "sys_conditional_activation_off",
        );
        expect(offRule).toMatchObject({
            id: "sys_conditional_activation_off",
            sortKey: "sys_001b",
            actions: [
                {
                    type: "MUTATE",
                    target: "self.state.conditional_activation_active.value",
                    op: "SET",
                    value: 0,
                },
            ],
        });
        expect(offRule?.conditions[0]?.compiled).toEqual({
            "!": [{ ">=": [{ var: "sys_world.state.food.value" }, 1] }],
        });
    });

    it("suffixes rule ids/sortKeys and the state key with _<index> for index > 0", () => {
        const draft = createBlueprint("bp", { components: {} });

        compileConditionalActivationConfig(draft, makeConfig(), 2);

        // index > 0 -> suffixed active-state key.
        expect(
            draft.components.state?.conditional_activation_active_2,
        ).toEqual({ value: 0, visible: false });
        expect(
            draft.components.state?.conditional_activation_active,
        ).toBeUndefined();

        const rules = draft.components.behavior?.rules ?? [];
        const ids = rules.map((r) => r.id);
        expect(ids).toEqual([
            "sys_conditional_activation_on_2",
            "sys_conditional_activation_off_2",
        ]);
        expect(rules.map((r) => r.sortKey)).toEqual([
            "sys_001_2",
            "sys_001b_2",
        ]);
        // The MUTATE target uses the suffixed state key too.
        expect(rules[0]?.actions[0]).toMatchObject({
            target: "self.state.conditional_activation_active_2.value",
            value: 1,
        });
        expect(rules[1]?.actions[0]).toMatchObject({
            target: "self.state.conditional_activation_active_2.value",
            value: 0,
        });
    });

    it("wraps multiple conditions in an `and` for the on-gate (and its negation for off)", () => {
        const draft = createBlueprint("bp", { components: {} });

        compileConditionalActivationConfig(
            draft,
            makeConfig({
                conditions: [
                    {
                        kind: "world_state_threshold",
                        key: "food",
                        operator: ">=",
                        value: 1,
                    },
                    {
                        kind: "world_state_threshold",
                        key: "heat",
                        operator: "<",
                        value: 5,
                    },
                ],
            }),
            0,
        );

        const rules = draft.components.behavior?.rules ?? [];
        expect(
            rules.find((r) => r.id === "sys_conditional_activation_on")
                ?.conditions[0]?.compiled,
        ).toEqual({
            and: [
                { ">=": [{ var: "sys_world.state.food.value" }, 1] },
                { "<": [{ var: "sys_world.state.heat.value" }, 5] },
            ],
        });
        expect(
            rules.find((r) => r.id === "sys_conditional_activation_off")
                ?.conditions[0]?.compiled,
        ).toEqual({
            "!": [
                {
                    and: [
                        { ">=": [{ var: "sys_world.state.food.value" }, 1] },
                        { "<": [{ var: "sys_world.state.heat.value" }, 5] },
                    ],
                },
            ],
        });
    });

    it("returns early without emitting anything when conditions is empty", () => {
        const draft = createBlueprint("bp", { components: {} });

        compileConditionalActivationConfig(
            draft,
            makeConfig({ conditions: [] }),
            0,
        );

        expect(draft.components.behavior).toBeUndefined();
        expect(
            draft.components.state?.conditional_activation_active,
        ).toBeUndefined();
    });

    it("treats undefined conditions as empty (no rules emitted)", () => {
        const draft = createBlueprint("bp", { components: {} });

        compileConditionalActivationConfig(
            draft,
            { targets: [] } as never,
            0,
        );

        expect(draft.components.behavior).toBeUndefined();
    });

    it("appends to a pre-existing behavior.rules array without clobbering it", () => {
        const existing = {
            id: "sys_other",
            sortKey: "sys_000",
            conditions: [],
            actions: [],
        };
        const draft = createBlueprint("bp", {
            components: { behavior: { rules: [existing] } },
        });

        compileConditionalActivationConfig(draft, makeConfig(), 0);

        const ids = draft.components.behavior?.rules?.map((r) => r.id);
        expect(ids).toEqual([
            "sys_other",
            "sys_conditional_activation_on",
            "sys_conditional_activation_off",
        ]);
    });

    it("initializes behavior.rules when behavior exists but rules is undefined", () => {
        // Drives `draft.components.behavior.rules ??= []` with behavior already
        // present (rules absent).
        const draft = createBlueprint("bp", {
            components: { behavior: {} as Blueprint["components"]["behavior"] },
        });

        compileConditionalActivationConfig(draft, makeConfig(), 0);

        expect(draft.components.behavior?.rules?.map((r) => r.id)).toEqual([
            "sys_conditional_activation_on",
            "sys_conditional_activation_off",
        ]);
    });

    it("does not overwrite an existing active-state entry (??=)", () => {
        const draft = createBlueprint("bp", {
            components: {
                state: {
                    conditional_activation_active: {
                        value: 1,
                        visible: true,
                    },
                },
            },
        });

        compileConditionalActivationConfig(draft, makeConfig(), 0);

        // Pre-existing entry is preserved (not reset to {value:0,visible:false}).
        expect(
            draft.components.state?.conditional_activation_active,
        ).toEqual({ value: 1, visible: true });
    });
});

describe("validateConditionalActivationTargets", () => {
    const baseAbilities = {
        cycle: {
            maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
            inputs: {},
            oneOff: false,
            conditions: [],
        },
        production: [
            {
                id: "prod-1",
                resource: "wood",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
        ],
    };

    it("does NOT warn when every target is supported and valid", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        validateConditionalActivationTargets(
            "bp",
            baseAbilities as never,
            [
                {
                    conditions: oneCondition,
                    targets: [
                        { ability: "cycle" },
                        { ability: "production", targetId: "prod-1" },
                    ],
                },
            ],
        );

        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it("warns 'unsupported' for a non-targetable ability and names the ability + index", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        validateConditionalActivationTargets(
            "bpX",
            baseAbilities as never,
            [
                { conditions: oneCondition, targets: [] },
                {
                    conditions: oneCondition,
                    // `storage` is NOT in the targetable set.
                    targets: [{ ability: "storage" } as ConditionalActivationTarget],
                },
            ],
        );

        // The forEach index (1) is interpolated, as is the ability name.
        expect(warn).toHaveBeenCalledWith(
            "Conditional Activation[1] target on 'bpX' is unsupported: storage.",
        );
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });

    it("warns 'stale' for a supported-but-missing target, using 'missing' when targetId is absent", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        validateConditionalActivationTargets(
            "bpY",
            // production exists but has no matching id; cycle ability absent.
            { production: [] } as never,
            [
                {
                    conditions: oneCondition,
                    targets: [{ ability: "production" }],
                },
            ],
        );

        expect(warn).toHaveBeenCalledWith(
            "Conditional Activation[0] target on 'bpY' is stale: production:missing.",
        );
        warn.mockRestore();
    });

    it("warns 'stale' with the actual targetId when one is provided but unmatched", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        validateConditionalActivationTargets(
            "bpZ",
            baseAbilities as never,
            [
                {
                    conditions: oneCondition,
                    targets: [{ ability: "production", targetId: "ghost" }],
                },
            ],
        );

        expect(warn).toHaveBeenCalledWith(
            "Conditional Activation[0] target on 'bpZ' is stale: production:ghost.",
        );
        warn.mockRestore();
    });

    it("does not warn 'stale' for a supported ability that IS targetable and valid (cycle present)", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        validateConditionalActivationTargets(
            "bp",
            baseAbilities as never,
            [{ conditions: oneCondition, targets: [{ ability: "cycle" }] }],
        );

        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it("treats an undefined targets list as empty (no warnings, no throw)", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        validateConditionalActivationTargets(
            "bp",
            baseAbilities as never,
            [{ conditions: oneCondition } as ConditionalActivationAbilityConfig],
        );

        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });
});
