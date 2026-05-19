import { describe, expect, it, vi } from "vitest";
import { resolveOwnedCaveKnowledgeEffects } from "./resolveOwnedCaveKnowledgeEffects";

const habitusIndex = {
    woods: {
        id: "woods",
        label: "Woods",
        description: "",
        summary: "",
        type: "profession",
        excludes: [],
        effects: [
            { type: "increase_max_purge", amount: 20, description: "" },
            {
                type: "add_resource_gain_multiplier",
                resource: "wood",
                amount: 0.1,
                description: "",
            },
        ],
    },
} as const;

const understandingIndex = {
    insight: {
        id: "insight",
        label: "Insight",
        description: "",
        effects: [
            { type: "increase_max_purge", amount: 30, description: "" },
            {
                type: "add_cave_attribute",
                attribute: "mind",
                amount: 2,
                description: "",
            },
        ],
    },
} as const;

describe("resolveOwnedCaveKnowledgeEffects purge progress", () => {
    it("aggregates purge max bonuses from Habiti and Understanding together", () => {
        const resolved = resolveOwnedCaveKnowledgeEffects({
            ownedHabiti: ["woods"],
            habitusIndex: habitusIndex as any,
            ownedUnderstanding: ["insight"],
            understandingIndex: understandingIndex as any,
        });
        expect(resolved.purgeProgressMaxBonus).toBe(50);
    });

    it("reports unknown ids without affecting the purge total", () => {
        const onUnknownHabitusId = vi.fn();
        const onUnknownUnderstandingId = vi.fn();
        const resolved = resolveOwnedCaveKnowledgeEffects({
            ownedHabiti: ["woods", "missing"],
            habitusIndex: habitusIndex as any,
            ownedUnderstanding: ["ghost", "insight"],
            understandingIndex: understandingIndex as any,
            onUnknownHabitusId,
            onUnknownUnderstandingId,
        });
        expect(resolved.purgeProgressMaxBonus).toBe(50);
        expect(onUnknownHabitusId).toHaveBeenCalledWith("missing");
        expect(onUnknownUnderstandingId).toHaveBeenCalledWith("ghost");
    });

    it("keeps existing resource and attribute aggregation unchanged", () => {
        const resolved = resolveOwnedCaveKnowledgeEffects({
            ownedHabiti: ["woods"],
            habitusIndex: habitusIndex as any,
            ownedUnderstanding: ["insight"],
            understandingIndex: understandingIndex as any,
        });
        expect(resolved.resourceGainMultipliers).toEqual({ wood: 0.1 });
        expect(resolved.attributeBonuses.mind).toBe(2);
    });
});
