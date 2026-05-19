import { describe, it, expect } from "vitest";
import { LogicRuleSchema } from "./logic";
import { BehaviorRuleSchema } from "./behavior";
import { SpawnerAbilitySchema } from "./abilities/spawner";
import { AssignmentMinimumRuleSchema } from "./assignmentRules";

describe("data/schemas sortKey stability", () => {
    it("injects sortKey when missing", () => {
        const logic = LogicRuleSchema.parse({ id: "r1", tokens: [] });
        expect(logic.sortKey).toBeDefined();

        const behavior = BehaviorRuleSchema.parse({
            id: "b1",
            conditions: [{ id: "c1", tokens: [] }],
            actions: [],
        });
        expect(behavior.sortKey).toBeDefined();
        expect(behavior.conditions[0]?.sortKey).toBeDefined();
    });

    it("preserves existing sortKey", () => {
        const logic = LogicRuleSchema.parse({
            id: "r2",
            sortKey: "sk_logic",
            tokens: [],
        });
        expect(logic.sortKey).toBe("sk_logic");

        const behavior = BehaviorRuleSchema.parse({
            id: "b2",
            sortKey: "sk_behavior",
            conditions: [{ id: "c2", sortKey: "sk_cond", tokens: [] }],
            actions: [],
        });
        expect(behavior.sortKey).toBe("sk_behavior");
        expect(behavior.conditions[0]?.sortKey).toBe("sk_cond");
    });

    it("coerces numeric string val tokens", () => {
        const logic = LogicRuleSchema.parse({
            id: "r3",
            tokens: [{ t: "val", v: "42" }],
        });
        expect(logic.tokens[0]).toMatchObject({ t: "val", v: 42 });

        const behavior = BehaviorRuleSchema.parse({
            id: "b3",
            conditions: [{ id: "c3", tokens: [{ t: "val", v: "3.5" }] }],
            actions: [],
        });
        expect(behavior.conditions[0]?.tokens[0]).toMatchObject({
            t: "val",
            v: 3.5,
        });
    });

    it("rejects non-finite assignment minimum thresholds", () => {
        expect(() =>
            AssignmentMinimumRuleSchema.parse({
                kind: "body_count",
                required: Number.POSITIVE_INFINITY,
            }),
        ).toThrow();
        expect(() =>
            AssignmentMinimumRuleSchema.parse({
                kind: "level_total",
                required: Number.POSITIVE_INFINITY,
            }),
        ).toThrow();
        expect(() =>
            AssignmentMinimumRuleSchema.parse({
                kind: "attribute_total",
                attribute: "body",
                required: Number.NaN,
            }),
        ).toThrow();
    });

    it("accepts body-count assignment minimums", () => {
        expect(
            AssignmentMinimumRuleSchema.parse({
                kind: "body_count",
                required: 2,
            }),
        ).toEqual({ kind: "body_count", required: 2 });
    });

    it("rejects duplicate forced habitus ids after trim normalization", () => {
        expect(() =>
            SpawnerAbilitySchema.parse({
                blueprintId: "worker",
                forcedHabiti: ["alpha", " alpha "],
            }),
        ).toThrow();
    });
});

