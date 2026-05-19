import { describe, expect, it } from "vitest";
import { adaptAbilityBarsToCapsules } from "./adaptAbilityBarsToCapsules";

describe("adaptAbilityBarsToCapsules", () => {
    it("adapts live ability bars to live capsules", () => {
        // Given
        const [result] = adaptAbilityBarsToCapsules([
            {
                id: "food",
                entityId: "pool-1",
                valuePath: "state.food.value",
                maxPath: "state.food.max",
                current: 4,
                max: 10,
                iconId: "food",
                title: "Food",
                valueBinding: {
                    id: "food:text",
                    entityId: "pool-1",
                    kind: "compact-fraction",
                    valuePath: "state.food.value",
                    maxPath: "state.food.max",
                },
                tooltipTitle: "Food",
                tooltipLines: ["Stored food."],
            },
        ] as any);

        // When / Then
        expect(result.value).toEqual({
            binding: {
                id: "food:text",
                entityId: "pool-1",
                kind: "compact-fraction",
                valuePath: "state.food.value",
                maxPath: "state.food.max",
            },
        });
        expect(result.progress?.valuePath).toBe("state.food.value");
    });

    it("preserves static meta text as an effect segment", () => {
        // Given / When
        const [result] = adaptAbilityBarsToCapsules([
            {
                id: "food",
                entityId: "pool-1",
                valuePath: "state.food.value",
                maxValue: 6,
                current: 3,
                max: 6,
                iconId: "food",
                title: "Food",
                valueText: "3/6",
                titleMetaText: "1.75/s",
                tooltipTitle: "Food",
                tooltipLines: ["Stored food."],
            },
        ] as any);

        // Then
        expect(result.effects[0]?.text).toBe("1.75/s");
        expect(result.tooltip?.lines).toEqual(["Stored food."]);
    });
});
