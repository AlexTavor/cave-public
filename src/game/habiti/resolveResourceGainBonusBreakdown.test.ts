import { describe, expect, it } from "vitest";
import { resolveResourceGainBonusBreakdown } from "./resolveResourceGainBonusBreakdown";

describe("resolveResourceGainBonusBreakdown", () => {
    it("aggregates matching habitus bonuses and keeps authored descriptions", () => {
        const breakdown = resolveResourceGainBonusBreakdown({
            resource: "wood",
            ownedHabiti: ["woods", "cook"],
            habitusIndex: {
                cook: {
                    id: "cook",
                    label: "Cook",
                    description: "",
                    summary: "",
                    type: "profession",
                    excludes: [],
                    effects: [
                        {
                            type: "add_resource_gain_multiplier",
                            resource: "food",
                            amount: 0.1,
                            description: "+10% food",
                        },
                    ],
                },
                woods: {
                    id: "woods",
                    label: "Woodsman",
                    description: "",
                    summary: "",
                    type: "profession",
                    excludes: [],
                    effects: [
                        {
                            type: "add_resource_gain_multiplier",
                            resource: "wood",
                            amount: 0.1,
                            description: "+10% wood",
                        },
                        {
                            type: "add_resource_gain_multiplier",
                            resource: "wood",
                            amount: 0.05,
                            description: "+5% wood",
                        },
                    ],
                },
            },
        });

        expect(breakdown.totalDelta).toBeCloseTo(0.15);
        expect(breakdown.contributions).toHaveLength(1);
        expect(breakdown.contributions[0]).toMatchObject({
            habitusId: "woods",
            label: "Woodsman",
            descriptions: ["+10% wood", "+5% wood"],
        });
        expect(breakdown.contributions[0]?.delta).toBeCloseTo(0.15);
    });

    it("keeps producer-tag bonuses as separate contribution origins", () => {
        const breakdown = resolveResourceGainBonusBreakdown({
            resource: "wood",
            producerTags: ["artisan"],
            ownedHabiti: ["smith"],
            habitusIndex: {
                smith: {
                    id: "smith",
                    label: "Smith",
                    description: "",
                    summary: "",
                    type: "profession",
                    excludes: [],
                    effects: [
                        {
                            type: "add_resource_gain_multiplier",
                            resource: "wood",
                            amount: 0.1,
                            description: "+10% wood",
                        },
                        {
                            type: "add_producer_output_multiplier",
                            producerTag: "artisan",
                            amount: 0.25,
                            description: "+25% artisan",
                        },
                    ],
                },
            } as any,
        });
        expect(breakdown.totalDelta).toBeCloseTo(0.35);
        expect(breakdown.contributions).toHaveLength(2);
    });
});
