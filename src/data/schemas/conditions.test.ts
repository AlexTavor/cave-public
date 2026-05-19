import { describe, expect, it } from "vitest";
import { ConditionsSchema, StructuredConditionSchema } from "./conditions";

describe("ConditionsSchema", () => {
    it("parses authored condition definitions", () => {
        expect(
            ConditionsSchema.parse([
                {
                    id: "intro_ready",
                    label: "Intro Ready",
                    conditions: [
                        {
                            kind: "fact_threshold",
                            scope: "permanent",
                            factType: "tutorial_completed",
                            factAbout: "intro",
                            operator: ">=",
                            value: 1,
                        },
                    ],
                },
            ]),
        ).toHaveLength(1);
        expect(
            ConditionsSchema.parse([
                { id: "intro_ready", label: "Intro Ready", conditions: [] },
            ])[0]?.selfDefinition,
        ).toEqual({ kind: "auto" });
        expect(
            StructuredConditionSchema.parse({
                kind: "user_interaction",
                interaction: "self_selected",
            }).kind,
        ).toBe("user_interaction");
        const draftCondition = StructuredConditionSchema.parse({
            kind: "fact_threshold",
            scope: "run",
            factType: "throttle_level",
            factAbout: "self",
            operator: ">",
            value: 0.5,
        }) as any;
        expect(draftCondition.factType).toBe("throttle_level");
        const selectorCondition = StructuredConditionSchema.parse({
            kind: "fact_threshold",
            scope: "run",
            factType: "body_selector_open",
            factAbout: "world",
            operator: ">=",
            value: 1,
        }) as any;
        expect(selectorCondition.factType).toBe("body_selector_open");
        expect(
            StructuredConditionSchema.parse({
                kind: "fact_threshold",
                scope: "run",
                factType: "processing_ongoing",
                factAbout: "world",
                operator: ">=",
                value: 1,
            }),
        ).toMatchObject({
            kind: "fact_threshold",
            factType: "processing_ongoing",
        });
        expect(
            StructuredConditionSchema.parse({
                kind: "fact_threshold",
                scope: "run",
                factType: "understanding_owned",
                factAbout: "insight",
                operator: ">=",
                value: 1,
            }),
        ).toMatchObject({
            factType: "understanding_owned",
            factAbout: "insight",
        });
        expect(
            StructuredConditionSchema.parse({
                kind: "fact_threshold",
                scope: "run",
                factType: "cave_status",
                factAbout: "food",
                operator: ">=",
                value: 1,
            }),
        ).toMatchObject({ factType: "cave_status", factAbout: "food" });
    });

    it("rejects invalid cave_status factAbout values", () => {
        expect(() =>
            StructuredConditionSchema.parse({
                kind: "fact_threshold",
                scope: "run",
                factType: "cave_status",
                factAbout: "world",
                operator: ">=",
                value: 1,
            }),
        ).toThrow(/cave_status factAbout/);
    });

    it("rejects duplicate condition ids", () => {
        expect(() =>
            ConditionsSchema.parse([
                { id: "dup", label: "A" },
                { id: "dup", label: "B" },
            ]),
        ).toThrow(/Duplicate condition id/);
    });

    it("parses destructive assignment conditions without authored fields", () => {
        expect(
            StructuredConditionSchema.parse({
                kind: "destructive_assignment_has_all_bodies",
            }),
        ).toMatchObject({ kind: "destructive_assignment_has_all_bodies" });
    });
});
