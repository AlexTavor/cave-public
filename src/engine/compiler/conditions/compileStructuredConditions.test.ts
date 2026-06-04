import { describe, expect, it } from "vitest";
import {
    compileStructuredConditionAllGate,
    compileStructuredConditionNotAllGate,
    compileStructuredConditions,
} from "./compileStructuredConditions";

const conditions = [
    {
        kind: "fact_threshold",
        scope: "run",
        factType: "elapsed_real_seconds",
        factAbout: "world",
        operator: ">=",
        value: 3,
    },
    { kind: "world_state_threshold", key: "food", operator: "<", value: 2 },
] as const;

describe("compileStructuredConditions", () => {
    it("compiles fact and world-state thresholds to the correct refs", () => {
        const [factRule, worldRule] = compileStructuredConditions([
            ...conditions,
        ]);
        expect(factRule.compiled).toEqual({
            ">=": [{ var: "sys_world.run.elapsed_real_seconds.world" }, 3],
        });
        expect(worldRule.compiled).toEqual({
            "<": [{ var: "sys_world.state.food.value" }, 2],
        });
    });

    it("compiles throttle_level about self to the entity throttle ref", () => {
        const [rule] = compileStructuredConditions([
            {
                kind: "fact_threshold",
                scope: "run",
                factType: "throttle_level",
                factAbout: "self",
                operator: ">",
                value: 0.5,
            },
        ] as const);
        expect(rule.compiled).toEqual({
            ">": [{ var: "self.powerSink.throttle" }, 0.5],
        });
    });

    it("compiles cave_status to sys_world state refs", () => {
        const [rule] = compileStructuredConditions([
            {
                kind: "fact_threshold",
                scope: "run",
                factType: "cave_status",
                factAbout: "heat",
                operator: ">=",
                value: 10,
            },
        ] as const);
        expect(rule.compiled).toEqual({
            ">=": [{ var: "sys_world.state.heat.value" }, 10],
        });
    });

    it("compiles tutorial-specific condition kinds", () => {
        const [tagRule, booleanRule, selectedRule, unselectedRule] =
            compileStructuredConditions([
                { kind: "entity_tag_present", tag: "cave_exploration" },
                { kind: "world_state_boolean", key: "seen", value: true },
                { kind: "user_interaction", interaction: "self_selected" },
                { kind: "user_interaction", interaction: "self_unselected" },
            ] as const);
        expect(tagRule.compiled).toEqual({
            ">=": [{ QUERY_COUNT: ["cave_exploration"] }, 1],
        });
        expect(booleanRule.compiled).toEqual({
            "==": [{ var: "sys_world.state.seen.value" }, true],
        });
        expect(selectedRule.compiled).toEqual({
            "==": [
                { var: "self.id" },
                { var: "sys_world.state.cave_selected_entity_id.value" },
            ],
        });
        expect(unselectedRule.compiled).toEqual({
            "!=": [
                { var: "self.id" },
                { var: "sys_world.state.cave_selected_entity_id.value" },
            ],
        });
    });

    it("compiles the aggregated AND gate", () => {
        expect(
            compileStructuredConditionAllGate([...conditions])?.compiled,
        ).toEqual({
            and: [
                {
                    ">=": [
                        { var: "sys_world.run.elapsed_real_seconds.world" },
                        3,
                    ],
                },
                { "<": [{ var: "sys_world.state.food.value" }, 2] },
            ],
        });
    });

    it("compiles the negated AND gate", () => {
        expect(
            compileStructuredConditionNotAllGate([...conditions])?.compiled,
        ).toEqual({
            "!": [
                {
                    and: [
                        {
                            ">=": [
                                {
                                    var: "sys_world.run.elapsed_real_seconds.world",
                                },
                                3,
                            ],
                        },
                        { "<": [{ var: "sys_world.state.food.value" }, 2] },
                    ],
                },
            ],
        });
    });

    it("returns null gates for empty condition arrays", () => {
        expect(compileStructuredConditionAllGate([])).toBeNull();
        expect(compileStructuredConditionNotAllGate([])).toBeNull();
    });
});

describe("compileStructuredConditions deterministic identity", () => {
    it("derives per-condition id/sortKey from kind + index (no random ids)", () => {
        const [factRule, worldRule] = compileStructuredConditions([
            ...conditions,
        ]);
        expect(factRule.id).toBe("structured_fact_threshold_0");
        expect(factRule.sortKey).toBe("structured_fact_threshold_0");
        expect(worldRule.id).toBe("structured_world_state_threshold_1");
        expect(worldRule.sortKey).toBe("structured_world_state_threshold_1");
    });

    it("labels the AND gate and negated gate with stable keys", () => {
        const allGate = compileStructuredConditionAllGate([...conditions]);
        const notAllGate = compileStructuredConditionNotAllGate([
            ...conditions,
        ]);
        expect(allGate?.id).toBe("structured_all_gate");
        expect(allGate?.sortKey).toBe("structured_all_gate");
        expect(notAllGate?.id).toBe("structured_not_all_gate");
        expect(notAllGate?.sortKey).toBe("structured_not_all_gate");
    });

    it("is reproducible: same input compiles to byte-identical rules", () => {
        // The whole point of dropping nanoid()/ulid(): recompiling a blueprint
        // must yield identical output. A deep-equal across two compiles only
        // holds because id/sortKey are now deterministic.
        expect(compileStructuredConditions([...conditions])).toEqual(
            compileStructuredConditions([...conditions]),
        );
        expect(compileStructuredConditionAllGate([...conditions])).toEqual(
            compileStructuredConditionAllGate([...conditions]),
        );
    });
});
