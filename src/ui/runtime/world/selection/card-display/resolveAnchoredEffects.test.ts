import { describe, expect, it } from "vitest";
import { resolveAnchoredEffects } from "./resolveAnchoredEffects";

describe("resolveAnchoredEffects", () => {
    it("anchors matching modifiers and leaves unmatched upkeep residual", () => {
        // Given
        const result = resolveAnchoredEffects({
            modifiers: [
                {
                    targetKey: "body",
                    valueStr: "+2",
                    sourceType: "cave",
                    sourceId: "cave",
                },
                {
                    targetKey: "food",
                    valueStr: "-1",
                    intervalStr: "/s",
                    sourceType: "upkeep",
                    sourceId: "upkeep",
                },
            ],
            traits: [],
            localTargets: ["body"],
        });

        // When / Then
        expect(result.byTarget.body[0]?.text).toBe("+2");
        expect(result.residualEffects[0]?.effects[0]?.text).toBe("-1/s");
    });

    it("anchors trait cycle effects when the target exists locally", () => {
        // Given / When
        const result = resolveAnchoredEffects({
            modifiers: [],
            traits: [
                {
                    traitId: "regen",
                    label: "Regeneration",
                    effects: [
                        {
                            targetKey: "health",
                            valueStr: "+1",
                            intervalStr: "/5s",
                        },
                    ],
                },
            ],
            localTargets: ["health"],
        });

        // Then
        expect(result.byTarget.health[0]?.text).toBe("+1/5s");
        expect(result.residualEffects).toHaveLength(0);
    });

    it("preserves modifier-before-trait ordering on the same target", () => {
        // Given / When
        const result = resolveAnchoredEffects({
            modifiers: [
                {
                    targetKey: "body",
                    valueStr: "+2",
                    sourceType: "cave",
                    sourceId: "cave",
                },
            ],
            traits: [
                {
                    traitId: "cold",
                    label: "Cold",
                    effects: [
                        {
                            targetKey: "body",
                            valueStr: "-1",
                            intervalStr: "/s",
                        },
                    ],
                },
            ],
            localTargets: ["body"],
        });

        // Then
        expect(result.byTarget.body.map((effect) => effect.text)).toEqual([
            "+2",
            "-1/s",
        ]);
    });
});
