import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { triggeredActionsCompiler } from "./triggeredActionsCompiler";
import { createBlueprint } from "../../test/factories";
import { getConditionalActivationActiveStateKey } from "../../runtime/conditionalActivationState";
import type { TriggeredActionsAbilityConfig } from "../../../data/schemas/abilities/triggeredActions";

const config: TriggeredActionsAbilityConfig = {
    id: "ta-1",
    triggers: ["assignment_complete"],
    conditions: ["self.state.ready.value == 1"],
    actions: [{ type: "KILL_ALL_BODIES_EXCEPT", quantity: 2 }],
};

describe("triggeredActionsCompiler", () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi
            .spyOn(console, "warn")
            .mockImplementation(() => undefined);
    });
    afterEach(() => vi.restoreAllMocks());

    it("compiles one rule per entry and preserves authored actions", () => {
        const blueprint = createBlueprint("bp", { components: {} });
        triggeredActionsCompiler(blueprint, config, 0);
        const rule = blueprint.components.behavior?.rules?.[0];
        expect(rule?.id).toBe("sys_triggered_actions_ta-1");
        expect(rule?.conditions[0]?.compiled).toEqual({
            ">": [{ var: "self.state.assignment_complete_pulse.value" }, 0],
        });
        expect(rule?.conditions[1]?.tokens).toEqual([
            { t: "ref", v: "self.state.ready.value" },
            { t: "op", v: "==" },
            { t: "val", v: 1 },
        ]);
        expect(rule?.actions).toEqual(config.actions);
    });

    it("appends conditional activation state only when selected", () => {
        const blueprint = createBlueprint("bp", { components: {} });
        triggeredActionsCompiler(blueprint, config, 0, {
            conditions: [],
            targets: [{ ability: "triggeredActions", targetId: "ta-1" }],
        });
        expect(
            blueprint.components.behavior?.rules?.[0]?.conditions,
        ).toContainEqual(
            expect.objectContaining({
                compiled: {
                    var: `self.state.${getConditionalActivationActiveStateKey(0)}.value`,
                },
            }),
        );
    });

    it("appends one active-state ref per matching conditional activation", () => {
        const blueprint = createBlueprint("bp", { components: {} });
        triggeredActionsCompiler(blueprint, config, 0, [
            {
                conditions: [],
                targets: [{ ability: "triggeredActions", targetId: "ta-1" }],
            },
            {
                conditions: [],
                targets: [{ ability: "triggeredActions", targetId: "ta-1" }],
            },
        ]);
        expect(
            blueprint.components.behavior?.rules?.[0]?.conditions
                .map((entry) => entry.compiled)
                .filter(
                    (entry) =>
                        typeof entry === "object" &&
                        entry !== null &&
                        "var" in entry,
                ),
        ).toEqual([
            {
                var: `self.state.${getConditionalActivationActiveStateKey(0)}.value`,
            },
            {
                var: `self.state.${getConditionalActivationActiveStateKey(1)}.value`,
            },
        ]);
    });

    it("warns when cycle_complete is used without cycle state", () => {
        const blueprint = createBlueprint("bp", { components: {} });
        triggeredActionsCompiler(
            blueprint,
            { ...config, triggers: ["cycle_complete"] },
            0,
        );
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining("requires cycle"),
        );
    });

    it("builds the complete rule (deep-equal) with default triggers and index id", () => {
        // triggers omitted -> default ["cycle_complete"] (two cycle conditions),
        // config.id omitted -> id falls back to the index. Actions pass through.
        // A cycle is present so no warning fires.
        const blueprint = createBlueprint("trig_bp", {
            components: {
                state: { cycle: { value: 0, max: 10, visible: false } },
            },
        });

        triggeredActionsCompiler(
            blueprint,
            {
                actions: [{ type: "KILL_ALL_BODIES_EXCEPT", quantity: 2 }],
            } as never,
            5,
        );

        expect(blueprint.components.behavior?.rules).toEqual([
            {
                id: "sys_triggered_actions_5",
                sortKey: "46_triggered_actions_5",
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
                actions: [{ type: "KILL_ALL_BODIES_EXCEPT", quantity: 2 }],
            },
        ]);
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it("uses config.id (not the index) for the rule id when provided", () => {
        // sortKey always uses the index; only the id uses config.id || index.
        const blueprint = createBlueprint("trig_bp", {
            components: {
                state: { cycle: { value: 0, max: 10, visible: false } },
            },
        });

        triggeredActionsCompiler(blueprint, { ...config }, 7);

        const rule = blueprint.components.behavior?.rules?.[0];
        expect(rule?.id).toBe("sys_triggered_actions_ta-1");
        expect(rule?.sortKey).toBe("46_triggered_actions_7");
    });

    it("does NOT warn when the trigger is assignment-only (cycle not required)", () => {
        // requiresCycleTrigger(["assignment_complete"]) === false short-circuits
        // the L17 AND, so the warn must not fire even with no cycle state.
        const blueprint = createBlueprint("bp", { components: {} });

        triggeredActionsCompiler(
            blueprint,
            { ...config, triggers: ["assignment_complete"] },
            0,
        );

        expect(warnSpy).not.toHaveBeenCalled();
    });

    it("does NOT warn when a cycle trigger is required and the cycle exists", () => {
        // L17: requiresCycleTrigger true, but !state.cycle is false -> no warn.
        const blueprint = createBlueprint("bp", {
            components: {
                state: { cycle: { value: 0, max: 10, visible: false } },
            },
        });

        triggeredActionsCompiler(
            blueprint,
            { ...config, triggers: ["cycle_complete"] },
            0,
        );

        expect(warnSpy).not.toHaveBeenCalled();
    });

    it("treats fully-absent components (optional chaining) as a missing cycle and warns", () => {
        // components is undefined -> components?.state?.cycle resolves to
        // undefined via optional chaining -> warn fires, structures created.
        const blueprint = createBlueprint("bare_trig", {});
        delete (blueprint as { components?: unknown }).components;

        expect(() =>
            triggeredActionsCompiler(
                blueprint,
                { ...config, triggers: ["cycle_complete"] },
                0,
            ),
        ).not.toThrow();

        expect(warnSpy).toHaveBeenCalledWith(
            "Triggered Actions ability requires cycle on 'bare_trig'.",
        );
        expect(blueprint.components.behavior?.rules).toHaveLength(1);
    });

    it("warns via the ':triggeredActions' context label for an invalid condition", () => {
        // Drives appendRuleConditions' error path so the L33 context-label
        // string is asserted exactly. "a b" is 2 parts, not 3.
        const blueprint = createBlueprint("ctx_trig", {
            components: {
                state: { cycle: { value: 0, max: 10, visible: false } },
            },
        });

        triggeredActionsCompiler(
            blueprint,
            { ...config, triggers: ["cycle_complete"], conditions: ["a b"] },
            0,
        );

        expect(warnSpy).toHaveBeenCalledWith(
            "Condition error in ctx_trig:triggeredActions: Condition must have exactly 3 parts (ref op value), got 2.",
        );
    });

    it("appends a new rule to a pre-existing behavior block that has no rules array", () => {
        // behavior present but rules absent -> `rules ??= []` must initialise
        // the array before pushing.
        const blueprint = createBlueprint("has_behavior", {
            components: {
                state: { cycle: { value: 0, max: 10, visible: false } },
                behavior: {} as { rules?: unknown[] },
            },
        });

        triggeredActionsCompiler(
            blueprint,
            { ...config, triggers: ["cycle_complete"] },
            0,
        );

        expect(blueprint.components.behavior?.rules).toHaveLength(1);
        expect(blueprint.components.behavior?.rules?.[0].id).toBe(
            "sys_triggered_actions_ta-1",
        );
    });
});
