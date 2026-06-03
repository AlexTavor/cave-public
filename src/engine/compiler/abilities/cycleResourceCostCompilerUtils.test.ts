import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import type { Blueprint } from "../../../data/schemas/blueprint";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import {
    ensureCycleCountTracking,
    findCycleCostRules,
    resolveCycleCostBarColor,
} from "./cycleResourceCostCompilerUtils";
import { resolveDefaultResourceProgressBarColor } from "../../../lib/displays/resourceProgressBarColor";

const rule = (id: string): BehaviorRule => ({
    id,
    sortKey: "0",
    conditions: [],
    actions: [],
});

const draftWithRules = (rules: BehaviorRule[]): Blueprint =>
    createBlueprint("forge", {
        components: { behavior: { rules } },
    });

describe("findCycleCostRules", () => {
    it("returns exactly the three sys_cycle_* rules and drops everything else (deep-equal)", () => {
        const accumulate = rule("sys_cycle_accumulate");
        const reset = rule("sys_cycle_reset");
        const transition = rule("sys_cycle_transition");
        const draft = draftWithRules([
            rule("sys_other"),
            accumulate,
            rule("sys_cycle_cost_consume_food"),
            reset,
            transition,
            rule("sys_cycle_resetx"),
        ]);

        // Must match all three target ids and only those (kills any StringLiteral
        // mutation of the includes() array entries).
        expect(findCycleCostRules(draft)).toEqual([
            accumulate,
            reset,
            transition,
        ]);
    });

    it("does not match ids that merely contain a target substring", () => {
        const draft = draftWithRules([
            rule("xsys_cycle_reset"),
            rule("sys_cycle_resetx"),
            rule("sys_cycle_transitio"),
        ]);

        expect(findCycleCostRules(draft)).toEqual([]);
    });

    it("returns [] when behavior is absent (optional chaining + nullish default)", () => {
        const draft = createBlueprint("forge", { components: {} });

        expect(findCycleCostRules(draft)).toEqual([]);
    });

    it("returns [] when behavior.rules is undefined (optional chaining)", () => {
        const draft = createBlueprint("forge", {
            components: { behavior: {} as Blueprint["components"]["behavior"] },
        });

        expect(findCycleCostRules(draft)).toEqual([]);
    });
});

describe("ensureCycleCountTracking", () => {
    it("seeds the cycle_count state entry with the default { value: 1, visible: false }", () => {
        const draft = createBlueprint("forge", { components: {} });

        ensureCycleCountTracking(draft);

        expect(draft.components.state?.cycle_count).toEqual({
            value: 1,
            visible: false,
        });
    });

    it("does NOT overwrite an existing cycle_count entry (nullish assignment)", () => {
        const draft = createBlueprint("forge", {
            components: { state: { cycle_count: { value: 7, visible: true } } },
        });

        ensureCycleCountTracking(draft);

        expect(draft.components.state?.cycle_count).toEqual({
            value: 7,
            visible: true,
        });
    });

    it("appends the increment action to an existing sys_cycle_reset rule that lacks one (deep-equal)", () => {
        const reset = rule("sys_cycle_reset");
        const draft = draftWithRules([reset]);

        ensureCycleCountTracking(draft);

        const resetRule = draft.components.behavior?.rules?.find(
            (r) => r.id === "sys_cycle_reset",
        );
        expect(resetRule?.actions).toEqual([
            {
                type: "MUTATE",
                target: "self.state.cycle_count.value",
                op: "ADD",
                value: 1,
            },
        ]);
    });

    it("does NOT add a second increment when the reset rule already increments cycle_count", () => {
        const reset: BehaviorRule = {
            id: "sys_cycle_reset",
            sortKey: "0",
            conditions: [],
            actions: [
                {
                    type: "MUTATE",
                    target: "self.state.cycle_count.value",
                    op: "ADD",
                    value: 1,
                },
            ],
        };
        const draft = draftWithRules([reset]);

        ensureCycleCountTracking(draft);

        const resetRule = draft.components.behavior?.rules?.find(
            (r) => r.id === "sys_cycle_reset",
        );
        // hasIncrement true -> early return -> still exactly one action.
        expect(resetRule?.actions).toHaveLength(1);
    });

    it("treats a MUTATE on a different target as 'no increment' and appends one", () => {
        const reset: BehaviorRule = {
            id: "sys_cycle_reset",
            sortKey: "0",
            conditions: [],
            actions: [
                {
                    type: "MUTATE",
                    target: "self.state.cycle.value",
                    op: "SET",
                    value: 0,
                },
            ],
        };
        const draft = draftWithRules([reset]);

        ensureCycleCountTracking(draft);

        const resetRule = draft.components.behavior?.rules?.find(
            (r) => r.id === "sys_cycle_reset",
        );
        // Pre-existing SET (wrong target) is kept; the ADD increment is appended.
        expect(resetRule?.actions).toEqual([
            {
                type: "MUTATE",
                target: "self.state.cycle.value",
                op: "SET",
                value: 0,
            },
            {
                type: "MUTATE",
                target: "self.state.cycle_count.value",
                op: "ADD",
                value: 1,
            },
        ]);
    });

    it("treats a non-MUTATE action on the cycle_count target as 'no increment' and appends one", () => {
        const reset: BehaviorRule = {
            id: "sys_cycle_reset",
            sortKey: "0",
            conditions: [],
            actions: [
                {
                    type: "TRANSFER",
                    source: "self",
                    target: "self.state.cycle_count.value",
                    resource: "food",
                    amount: "1",
                },
            ],
        } as unknown as BehaviorRule;
        const draft = draftWithRules([reset]);

        ensureCycleCountTracking(draft);

        const resetRule = draft.components.behavior?.rules?.find(
            (r) => r.id === "sys_cycle_reset",
        );
        // type !== "MUTATE" -> hasIncrement false -> increment appended.
        expect(resetRule?.actions).toHaveLength(2);
        expect(resetRule?.actions[1]).toEqual({
            type: "MUTATE",
            target: "self.state.cycle_count.value",
            op: "ADD",
            value: 1,
        });
    });

    it("does nothing to rules when there is no sys_cycle_reset rule (early return)", () => {
        const accumulate = rule("sys_cycle_accumulate");
        const draft = draftWithRules([accumulate]);

        ensureCycleCountTracking(draft);

        // No reset rule -> early return after seeding cycle_count; accumulate
        // rule is untouched.
        expect(accumulate.actions).toEqual([]);
        expect(draft.components.state?.cycle_count).toEqual({
            value: 1,
            visible: false,
        });
    });

    it("returns early when behavior is absent (optional chaining on rules.find)", () => {
        const draft = createBlueprint("forge", { components: {} });

        // Must not throw; resetRule is undefined -> early return.
        expect(() => ensureCycleCountTracking(draft)).not.toThrow();
        expect(draft.components.behavior).toBeUndefined();
        expect(draft.components.state?.cycle_count).toEqual({
            value: 1,
            visible: false,
        });
    });
});

describe("resolveCycleCostBarColor re-export", () => {
    it("is the resolveDefaultResourceProgressBarColor function under a new name", () => {
        expect(resolveCycleCostBarColor).toBe(
            resolveDefaultResourceProgressBarColor,
        );
        // And it produces a deterministic hsl string for a given resource id.
        expect(resolveCycleCostBarColor("food")).toMatch(
            /^hsl\(\d+, 70%, 50%\)$/,
        );
    });
});
