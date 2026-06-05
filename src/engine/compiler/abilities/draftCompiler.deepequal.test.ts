import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { draftCompiler } from "./draftCompiler";
import { createBlueprint } from "../../test/factories";

const makeCycleBlueprint = (id = "bp_entity") =>
    createBlueprint(id, {
        components: { state: { cycle: { value: 0, max: 100, visible: true } } },
    });

describe("draftCompiler — full structural deep-equality", () => {
    beforeEach(() => {
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("builds the EXACT TRIGGER_DRAFT rule (id, sortKey, conditions, actions) for default triggers", () => {
        // Given a cycle blueprint and a full config (poolId/count/label set).
        const blueprint = makeCycleBlueprint();

        // When
        draftCompiler(
            blueprint,
            { poolId: "tier_1_pool", count: 3, label: "Recruit", conditions: [] },
            0,
        );

        // Then — deep-equal the whole rule. This pins:
        //  - id template `sys_draft_<poolId>_<index>` (L31)
        //  - sortKey "sys_070" (L32 StringLiteral)
        //  - default triggers -> cycleCompleteConditions() (L20 ??, L33)
        //  - the single action object (L35-44 ObjectLiteral / StringLiteral L36)
        //  - actions is a 1-element array (L34 ArrayDeclaration)
        const rules = blueprint.components.behavior?.rules ?? [];
        expect(rules).toEqual([
            {
                id: "sys_draft_tier_1_pool_0",
                sortKey: "sys_070",
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
                ],
                actions: [
                    {
                        type: "TRIGGER_DRAFT",
                        poolId: "tier_1_pool",
                        count: 3,
                        label: "Recruit",
                        triggerEntityId: "self",
                    },
                ],
            },
        ]);
    });

    it("trims surrounding whitespace from poolId before building the rule id (L19)", () => {
        // Given a poolId padded with whitespace.
        const blueprint = makeCycleBlueprint();

        // When
        draftCompiler(
            blueprint,
            { poolId: "  tier_1_pool  ", count: 1, conditions: [] },
            5,
        );

        // Then the rule id uses the TRIMMED poolId (kills L19 optional-chaining/.trim()).
        const rule = blueprint.components.behavior?.rules?.[0];
        expect(rule?.id).toBe("sys_draft_tier_1_pool_5");
        // The action keeps the RAW config.poolId (untrimmed) — distinct from the id.
        expect(rule?.actions[0]).toMatchObject({ poolId: "  tier_1_pool  " });
    });

    it("treats an all-whitespace poolId as empty: warns and does not mutate (L19 + L21)", () => {
        // Given a poolId that is only whitespace -> trim() makes it falsy.
        const blueprint = makeCycleBlueprint();

        // When
        draftCompiler(blueprint, { poolId: "   ", count: 1, conditions: [] }, 0);

        // Then no rule is produced and a warning fires.
        expect(blueprint.components.behavior).toBeUndefined();
        expect(console.warn).toHaveBeenCalledWith(
            "Draft ability missing poolId on 'bp_entity'.",
        );
    });

    it("treats an undefined poolId as empty via optional chaining (L19 ?.)", () => {
        // Given poolId is missing entirely (config.poolId?.trim() -> undefined).
        const blueprint = makeCycleBlueprint();

        // When
        draftCompiler(blueprint, { count: 1, conditions: [] } as never, 0);

        // Then the guard fires (no crash from calling .trim() on undefined).
        expect(blueprint.components.behavior).toBeUndefined();
        expect(console.warn).toHaveBeenCalledWith(
            "Draft ability missing poolId on 'bp_entity'.",
        );
    });

    it("warns about a missing cycle ONLY when a cycle trigger is required (L26 true branch)", () => {
        // Given a blueprint WITHOUT a state.cycle, defaulting to cycle_complete trigger.
        const blueprint = createBlueprint("bp_no_cycle", { components: {} });

        // When (triggers omitted -> defaults include "cycle_complete" -> requiresCycleTrigger true)
        draftCompiler(blueprint, { poolId: "pool", count: 1, conditions: [] }, 0);

        // Then the cycle warning fires AND the rule is still emitted.
        expect(console.warn).toHaveBeenCalledWith(
            "Draft ability requires cycle on 'bp_no_cycle'.",
        );
        expect(blueprint.components.behavior?.rules).toHaveLength(1);
    });

    it("does NOT warn about a missing cycle when the trigger is assignment-only (L26 false via requiresCycleTrigger)", () => {
        // Given no cycle, but an assignment-only trigger (requiresCycleTrigger === false).
        const blueprint = createBlueprint("bp_no_cycle", { components: {} });

        // When
        draftCompiler(
            blueprint,
            {
                poolId: "pool",
                count: 1,
                conditions: [],
                triggers: ["assignment_complete"],
            },
            0,
        );

        // Then NO cycle warning — and the conditions reflect the assignment trigger.
        expect(console.warn).not.toHaveBeenCalledWith(
            "Draft ability requires cycle on 'bp_no_cycle'.",
        );
        const rule = blueprint.components.behavior?.rules?.[0];
        expect(rule?.conditions).toEqual([
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
    });

    it("does NOT warn when a cycle trigger is required AND the cycle is present (L26 right operand false)", () => {
        // Given a blueprint WITH state.cycle and the default cycle trigger.
        const blueprint = makeCycleBlueprint();

        // When
        draftCompiler(blueprint, { poolId: "pool", count: 1, conditions: [] }, 0);

        // Then the cycle warning must NOT fire (draft.components?.state?.cycle is truthy).
        expect(console.warn).not.toHaveBeenCalledWith(
            "Draft ability requires cycle on 'bp_entity'.",
        );
    });

    it("appends authored gate conditions from config.conditions using the ':draft' context label (L48)", () => {
        // Given a cycle blueprint and an authored gate condition.
        const blueprint = makeCycleBlueprint("smelter");

        // When
        draftCompiler(
            blueprint,
            {
                poolId: "pool",
                count: 1,
                conditions: ["self.state.cycle.value > 0"],
            },
            2,
        );

        // Then a gate_<ruleId>_<index> condition is appended (context label "<id>:draft" feeds
        // appendRuleConditions). The gate id derives from the rule id built at L31.
        const rule = blueprint.components.behavior?.rules?.[0];
        const gate = rule?.conditions.find(
            (c) => c.id === "gate_sys_draft_pool_2_0",
        );
        expect(gate).toBeDefined();
        expect(gate?.sortKey).toBe("z_gate_0");
    });

    it("warns with the ':draft' context label when an authored condition fails to compile (L48 StringLiteral)", () => {
        // Given an unparseable condition string — appendRuleConditions warns with the context label.
        const blueprint = makeCycleBlueprint("smelter");

        // When
        draftCompiler(
            blueprint,
            {
                poolId: "pool",
                count: 1,
                conditions: ["@@@ not a condition @@@"],
            },
            0,
        );

        // Then the warning embeds the exact "<draft.id>:draft" context label.
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining("Condition error in smelter:draft:"),
        );
    });

    it("initializes behavior on a draft that has NO components at all (L54/55/56 ??= chain)", () => {
        // Given a blueprint whose `components` is undefined entirely.
        const blueprint = createBlueprint("bare", { components: undefined });
        // Force-remove the factory default display to exercise the components ??= branch.
        (blueprint as { components?: unknown }).components = undefined;

        // When
        draftCompiler(blueprint, { poolId: "pool", count: 1, conditions: [] }, 0);

        // Then components/behavior/rules are all created and the rule is pushed.
        expect(blueprint.components.behavior).toEqual({
            rules: [
                {
                    id: "sys_draft_pool_0",
                    sortKey: "sys_070",
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
                    ],
                    actions: [
                        {
                            type: "TRIGGER_DRAFT",
                            poolId: "pool",
                            count: 1,
                            triggerEntityId: "self",
                        },
                    ],
                },
            ],
        });
    });

    it("APPENDS to an existing behavior.rules array, preserving prior rules (L55/56 ??= keep existing)", () => {
        // Given a blueprint that already has a behavior rule.
        const existing = {
            id: "pre_existing",
            sortKey: "sys_010",
            conditions: [],
            actions: [],
        };
        const blueprint = createBlueprint("bp_entity", {
            components: {
                state: { cycle: { value: 0, max: 10, visible: true } },
                behavior: { rules: [existing] },
            },
        });

        // When
        draftCompiler(blueprint, { poolId: "pool", count: 1, conditions: [] }, 0);

        // Then the existing rule is preserved and the new rule is appended (array kept, not reset).
        const rules = blueprint.components.behavior?.rules ?? [];
        expect(rules).toHaveLength(2);
        expect(rules[0]).toBe(existing);
        expect(rules[1].id).toBe("sys_draft_pool_0");
    });

    it("defaults triggers to ['cycle_complete'] when config.triggers is undefined (L20 ??)", () => {
        // Given a config WITHOUT triggers but a present cycle (so no warn either way).
        const blueprint = makeCycleBlueprint();

        // When
        draftCompiler(blueprint, { poolId: "pool", count: 1, conditions: [] }, 0);

        // Then the rule conditions are the cycle-complete pair (default trigger path).
        const rule = blueprint.components.behavior?.rules?.[0];
        expect(rule?.conditions.map((c) => c.id)).toEqual([
            "cycle_complete",
            "cycle_has_max",
        ]);
    });
});
