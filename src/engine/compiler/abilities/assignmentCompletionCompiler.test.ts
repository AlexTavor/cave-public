import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import type { Blueprint } from "../../../data/schemas/blueprint";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import { prepareAssignmentCompletionTrigger } from "./assignmentCompletionCompiler";

const RULE_ID = "sys_assignment_complete_reset";

// The complete rule the compiler must push. Deep-equality on this single
// structure pins every id, sortKey, condition token, compiled expression, and
// action field along the construction path.
const EXPECTED_RULE: BehaviorRule = {
    id: RULE_ID,
    sortKey: "sys_999",
    conditions: [
        {
            id: "assignment_complete_pulse_active",
            sortKey: "0",
            tokens: [],
            compiled: {
                ">": [
                    { var: "self.state.assignment_complete_pulse.value" },
                    0,
                ],
            },
        },
    ],
    actions: [
        {
            type: "MUTATE",
            target: "self.state.assignment_complete_pulse.value",
            op: "SET",
            value: 0,
        },
    ],
};

const findRule = (draft: Blueprint, id: string) =>
    draft.components.behavior?.rules?.find((r) => r.id === id);

describe("prepareAssignmentCompletionTrigger", () => {
    it("seeds the assignment_complete_pulse state with the exact resting values", () => {
        const draft = createBlueprint("worker", { components: {} });

        prepareAssignmentCompletionTrigger(draft);

        expect(draft.components.state?.assignment_complete_pulse).toEqual({
            value: 0,
            visible: false,
        });
    });

    it("pushes the full reset rule (conditions + actions) verbatim", () => {
        const draft = createBlueprint("worker", { components: {} });

        prepareAssignmentCompletionTrigger(draft);

        expect(draft.components.behavior?.rules).toEqual([EXPECTED_RULE]);
    });

    it("creates components/state/behavior from a bare draft (?? defaults)", () => {
        // No components object at all -> exercises every `??=` default path.
        const draft = {
            id: "bare",
            label: "bare",
            tags: [],
        } as unknown as Blueprint;

        prepareAssignmentCompletionTrigger(draft);

        expect(draft.components.state?.assignment_complete_pulse).toEqual({
            value: 0,
            visible: false,
        });
        expect(draft.components.behavior?.rules).toEqual([EXPECTED_RULE]);
    });

    it("initialises behavior.rules when behavior exists but rules is undefined", () => {
        // behavior present, rules missing -> drives the `behavior.rules ??= []`
        // assignment + array-default at L13 (otherwise never executed).
        const draft = createBlueprint("worker", {
            components: { behavior: {} as Blueprint["components"]["behavior"] },
        });

        prepareAssignmentCompletionTrigger(draft);

        expect(draft.components.behavior?.rules).toEqual([EXPECTED_RULE]);
    });

    it("removes a pre-existing reset rule and re-appends exactly one (no duplicates)", () => {
        // A stale rule with the same id but different body must be filtered out
        // and replaced. This drives the `rule.id !== RULE_ID` predicate to the
        // false branch (it matches -> removed), and proves the filter runs.
        const stale: BehaviorRule = {
            id: RULE_ID,
            sortKey: "stale",
            conditions: [],
            actions: [],
        };
        const keep: BehaviorRule = {
            id: "sys_keep_me",
            sortKey: "sys_000",
            conditions: [],
            actions: [],
        };
        const draft = createBlueprint("worker", {
            components: { behavior: { rules: [keep, stale] } },
        });

        prepareAssignmentCompletionTrigger(draft);

        const rules = draft.components.behavior?.rules ?? [];
        // Unrelated rule preserved; reset rule present exactly once.
        expect(rules.filter((r) => r.id === RULE_ID)).toEqual([EXPECTED_RULE]);
        expect(rules.map((r) => r.id)).toEqual(["sys_keep_me", RULE_ID]);
    });

    it("preserves unrelated rules whose id differs from RULE_ID (filter keeps them)", () => {
        // Drives the `rule.id !== RULE_ID` predicate to the TRUE branch (kept).
        const other: BehaviorRule = {
            id: "sys_other",
            sortKey: "sys_010",
            conditions: [],
            actions: [],
        };
        const draft = createBlueprint("worker", {
            components: { behavior: { rules: [other] } },
        });

        prepareAssignmentCompletionTrigger(draft);

        expect(findRule(draft, "sys_other")).toEqual(other);
        expect(draft.components.behavior?.rules).toHaveLength(2);
    });

    it("is idempotent: running twice yields a single reset rule", () => {
        const draft = createBlueprint("worker", { components: {} });

        prepareAssignmentCompletionTrigger(draft);
        prepareAssignmentCompletionTrigger(draft);

        const resetRules = (draft.components.behavior?.rules ?? []).filter(
            (r) => r.id === RULE_ID,
        );
        expect(resetRules).toEqual([EXPECTED_RULE]);
    });
});
