import { describe, it, expect, vi } from "vitest";
import { updaterCompiler } from "./updaterCompiler";
import { createBlueprint } from "../../test/factories";
import type { BehaviorRule } from "../../../data/schemas/behavior";

const makeCycleBlueprint = (id = "bp_entity") =>
    createBlueprint(id, {
        components: {
            state: { cycle: { value: 0, max: 100, visible: true } },
        },
    });

const validConfig = {
    target: "sys_world.state.purge_progress.value",
    op: "ADD" as const,
    value: 1,
    conditions: [],
};

describe("updaterCompiler", () => {
    it("emits a MUTATE rule with cycle-complete conditions", () => {
        // Given
        const blueprint = makeCycleBlueprint();

        // When
        updaterCompiler(blueprint, validConfig, 0);

        // Then
        const rules = blueprint.components.behavior?.rules ?? [];
        expect(rules).toHaveLength(1);
        const rule = rules[0];
        expect(rule.id).toBe("sys_updater_0");
        expect(rule.sortKey).toBe("45_updater_0");
        expect(rule.conditions.length).toBeGreaterThanOrEqual(2);
        expect(rule.actions[0]).toMatchObject({
            type: "MUTATE",
            target: "sys_world.state.purge_progress.value",
            op: "ADD",
            value: 1,
        });
    });

    it("does not throw for empty target or zero value", () => {
        // Given
        const blueprint = makeCycleBlueprint();
        const config = {
            target: "",
            op: "SET" as const,
            value: 0,
            conditions: [],
        };

        // When / Then
        expect(() => updaterCompiler(blueprint, config, 0)).not.toThrow();
        const rules = blueprint.components.behavior?.rules ?? [];
        expect(rules).toHaveLength(1);
        expect(rules[0].actions[0]).toMatchObject({
            type: "MUTATE",
            target: "",
            op: "SET",
            value: 0,
        });
    });

    it("appends custom conditions alongside cycle conditions", () => {
        // Given
        const blueprint = makeCycleBlueprint();
        const config = {
            ...validConfig,
            conditions: ["self.state.purge_progress.value < 10"],
        };

        // When
        updaterCompiler(blueprint, config, 1);

        // Then
        const rules = blueprint.components.behavior?.rules ?? [];
        const rule = rules[0];
        expect(rule.conditions.length).toBeGreaterThan(2);
    });

    it("indexes the rule id by the provided index", () => {
        // Given
        const blueprint = makeCycleBlueprint();

        // When
        updaterCompiler(blueprint, validConfig, 3);

        // Then
        const rule = blueprint.components.behavior?.rules?.[0];
        expect(rule?.id).toBe("sys_updater_3");
        expect(rule?.sortKey).toBe("45_updater_3");
    });

    it("accepts a string logic reference as value", () => {
        // Given
        const blueprint = makeCycleBlueprint();
        const config = {
            ...validConfig,
            value: "self.state.power.value",
        };

        // When
        updaterCompiler(blueprint, config, 0);

        // Then
        const rule = blueprint.components.behavior?.rules?.[0];
        expect(rule?.actions[0]).toMatchObject({
            type: "MUTATE",
            value: "self.state.power.value",
        });
    });

    it("builds the complete rule (deep-equal) with default op/triggers/value", () => {
        // op, value and triggers all omitted -> op "ADD", value 1, triggers
        // ["cycle_complete"] (so the two cycle conditions are emitted verbatim).
        const blueprint = makeCycleBlueprint();

        updaterCompiler(
            blueprint,
            { target: "sys_world.state.purge_progress.value" } as never,
            2,
        );

        expect(blueprint.components.behavior?.rules).toEqual([
            {
                id: "sys_updater_2",
                sortKey: "45_updater_2",
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
                        type: "MUTATE",
                        target: "sys_world.state.purge_progress.value",
                        op: "ADD",
                        value: 1,
                    },
                ],
            },
        ]);
    });

    it("warns with the exact message and id when a cycle trigger lacks cycle state", () => {
        // requiresCycleTrigger(default triggers) === true AND no state.cycle ->
        // the warn branch fires. Asserts the L18 condition (true side) + the
        // exact L19 string interpolated with draft.id.
        const blueprint = createBlueprint("no_cycle_bp", { components: {} });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        updaterCompiler(blueprint, validConfig, 0);

        expect(warn).toHaveBeenCalledWith(
            "Updater ability requires cycle on 'no_cycle_bp'.",
        );
        warn.mockRestore();
    });

    it("does NOT warn when the trigger is assignment-only (no cycle required)", () => {
        // requiresCycleTrigger(["assignment_complete"]) === false -> the L18
        // condition short-circuits and the warn must not fire even without a
        // cycle. Also exercises the assignment trigger condition branch.
        const blueprint = createBlueprint("no_cycle_bp", { components: {} });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        updaterCompiler(
            blueprint,
            { ...validConfig, triggers: ["assignment_complete"] },
            0,
        );

        expect(warn).not.toHaveBeenCalled();
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
        warn.mockRestore();
    });

    it("does NOT warn when a cycle trigger is required and the cycle is present", () => {
        // L18: requiresCycleTrigger true but !state.cycle is false -> no warn.
        const blueprint = makeCycleBlueprint();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        updaterCompiler(blueprint, validConfig, 0);

        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it("treats fully-absent components (optional chaining) as a missing cycle and warns", () => {
        // draft.components is undefined here, so components?.state?.cycle must
        // safely resolve to undefined (optional chaining) -> warn fires, and
        // the components/behavior/rules chain is created from scratch.
        const blueprint = createBlueprint("bare", {});
        // Force components to be entirely absent (factory normally seeds it).
        delete (blueprint as { components?: unknown }).components;
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        expect(() => updaterCompiler(blueprint, validConfig, 0)).not.toThrow();

        expect(warn).toHaveBeenCalledWith(
            "Updater ability requires cycle on 'bare'.",
        );
        expect(blueprint.components.behavior?.rules).toHaveLength(1);
        expect(blueprint.components.behavior?.rules?.[0].id).toBe(
            "sys_updater_0",
        );
        warn.mockRestore();
    });

    it("warns via the ':updater' context label when a custom condition is invalid", () => {
        // Drives appendRuleConditions down its error path so the L35 context
        // label string is asserted exactly. "a b" tokenizes to 2 parts (not 3).
        const blueprint = makeCycleBlueprint("ctx_bp");
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        updaterCompiler(blueprint, { ...validConfig, conditions: ["a b"] }, 0);

        expect(warn).toHaveBeenCalledWith(
            "Condition error in ctx_bp:updater: Condition must have exactly 3 parts (ref op value), got 2.",
        );
        warn.mockRestore();
    });

    it("appends a new rule to a pre-existing behavior block that has no rules array", () => {
        // behavior exists but rules is absent -> the `rules ??= []` guard must
        // initialise the array before pushing (covers that nullish-assign path).
        const blueprint = createBlueprint("has_behavior", {
            components: {
                state: { cycle: { value: 0, max: 100, visible: true } },
                behavior: {} as { rules?: BehaviorRule[] },
            },
        });

        updaterCompiler(blueprint, validConfig, 0);

        expect(blueprint.components.behavior?.rules).toHaveLength(1);
        expect(blueprint.components.behavior?.rules?.[0].id).toBe(
            "sys_updater_0",
        );
    });
});
