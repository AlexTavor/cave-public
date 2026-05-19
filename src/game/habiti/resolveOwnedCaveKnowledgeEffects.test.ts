import { describe, expect, it, vi } from "vitest";
import { resolveOwnedCaveKnowledgeEffects } from "./resolveOwnedCaveKnowledgeEffects";

describe("resolveOwnedCaveKnowledgeEffects", () => {
    it("aggregates habiti and understanding bonuses together", () => {
        const resolved = resolveOwnedCaveKnowledgeEffects({
            ownedHabiti: ["woods"],
            habitusIndex: {
                woods: {
                    id: "woods",
                    label: "Woods",
                    description: "",
                    summary: "",
                    type: "profession",
                    excludes: [],
                    effects: [
                        {
                            type: "add_resource_gain_multiplier",
                            resource: "wood",
                            amount: 0.1,
                            description: "",
                        },
                    ],
                },
            },
            ownedUnderstanding: ["insight"],
            understandingIndex: {
                insight: {
                    id: "insight",
                    label: "Insight",
                    description: "",
                    effects: [
                        {
                            type: "add_cave_attribute",
                            attribute: "mind",
                            amount: 2,
                            description: "",
                        },
                    ],
                },
            },
        });

        expect(resolved.resourceGainMultipliers).toEqual({ wood: 0.1 });
        expect(resolved.attributeBonuses.mind).toBe(2);
    });

    it("reports unknown understanding ids without crashing", () => {
        const onUnknownUnderstandingId = vi.fn();
        resolveOwnedCaveKnowledgeEffects({
            ownedHabiti: [],
            habitusIndex: {},
            ownedUnderstanding: ["missing"],
            understandingIndex: {},
            onUnknownUnderstandingId,
        });
        expect(onUnknownUnderstandingId).toHaveBeenCalledWith("missing");
    });
});
