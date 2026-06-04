import { describe, expect, it } from "vitest";
import { buildAbilityTriggerConditions } from "./abilityTriggerConditions";

describe("buildAbilityTriggerConditions", () => {
    it("returns the exact two cycle-complete conditions by default", () => {
        const conditions = buildAbilityTriggerConditions(["cycle_complete"]);
        // Full structure of the default (cycle-only) branch.
        expect(conditions).toEqual([
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

    it("returns the cycle-complete conditions for an empty trigger list (default fallthrough)", () => {
        // Neither hasCycle nor hasAssignment -> default cycle branch.
        const conditions = buildAbilityTriggerConditions([]);
        expect(conditions.map((c) => c?.id)).toEqual([
            "cycle_complete",
            "cycle_has_max",
        ]);
    });

    it("builds the exact single assignment-complete condition when only assignment is present", () => {
        const conditions = buildAbilityTriggerConditions([
            "assignment_complete",
        ]);
        expect(conditions).toEqual([
            {
                id: "assignment_complete",
                sortKey: "0",
                tokens: [],
                compiled: {
                    ">": [
                        {
                            var: "self.state.assignment_complete_pulse.value",
                        },
                        0,
                    ],
                },
            },
        ]);
    });

    it("builds the exact combined OR condition when both triggers are present", () => {
        const conditions = buildAbilityTriggerConditions([
            "cycle_complete",
            "assignment_complete",
        ]);
        expect(conditions).toEqual([
            {
                id: "cycle_or_assignment_complete",
                sortKey: "0",
                tokens: [],
                compiled: {
                    or: [
                        {
                            and: [
                                {
                                    ">=": [
                                        { var: "self.state.cycle.value" },
                                        { var: "self.state.cycle.max" },
                                    ],
                                },
                                {
                                    ">": [{ var: "self.state.cycle.max" }, 0],
                                },
                            ],
                        },
                        {
                            ">": [
                                {
                                    var: "self.state.assignment_complete_pulse.value",
                                },
                                0,
                            ],
                        },
                    ],
                },
            },
        ]);
    });

    it("prefers the combined condition over the assignment-only condition when both flags are true", () => {
        // Drives the `hasCycle && hasAssignment` branch true: order of triggers
        // must not matter, and it must NOT fall through to the assignment-only
        // single condition.
        const conditions = buildAbilityTriggerConditions([
            "assignment_complete",
            "cycle_complete",
        ]);
        expect(conditions).toHaveLength(1);
        expect(conditions[0]?.id).toBe("cycle_or_assignment_complete");
    });
});
