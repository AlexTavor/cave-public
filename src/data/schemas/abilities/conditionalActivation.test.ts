import { describe, expect, it } from "vitest";
import {
    ConditionalActivationAbilityEntrySchema,
    ConditionalActivationAbilitySchema,
    normalizeConditionalActivationConfigs,
} from "./conditionalActivation";

describe("ConditionalActivationAbilitySchema", () => {
    it("accepts shared structured conditions and valid targets", () => {
        const parsed = ConditionalActivationAbilityEntrySchema.parse({
            conditions: [
                {
                    kind: "world_state_threshold",
                    key: "food",
                    operator: ">=",
                    value: 1,
                },
            ],
            targets: [{ ability: "production", targetId: "prod-1" }],
        });
        expect(parsed.conditions).toHaveLength(1);
        expect(parsed.targets).toEqual([
            { ability: "production", targetId: "prod-1" },
        ]);
    });

    it("accepts array-authored conditional activations", () => {
        expect(
            ConditionalActivationAbilitySchema.parse([{ targets: [] }]),
        ).toHaveLength(1);
    });

    it("normalizes singleton and array inputs with default priority", () => {
        expect(
            normalizeConditionalActivationConfigs({ targets: [] })[0]?.priority,
        ).toBe(0);
        expect(
            normalizeConditionalActivationConfigs([
                { inactiveExplanation: "first", targets: [] },
                { inactiveExplanation: "second", targets: [] },
            ]).map((entry) => entry.inactiveExplanation),
        ).toEqual(["first", "second"]);
    });

    it("rejects legacy free-form string conditions", () => {
        expect(() =>
            ConditionalActivationAbilitySchema.parse({
                conditions: ["self.state.ready.value == 1"],
                targets: [],
            }),
        ).toThrow();
    });
});
