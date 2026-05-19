import { describe, expect, it } from "vitest";
import { resolveResourceGainBonusBreakdown } from "./resolveResourceGainBonusBreakdown";

describe("resolveResourceGainBonusBreakdown understanding", () => {
    it("includes understanding contributions", () => {
        const breakdown = resolveResourceGainBonusBreakdown({
            resource: "wood",
            ownedHabiti: [],
            ownedUnderstanding: ["insight"],
            habitusIndex: {},
            understandingIndex: {
                insight: {
                    id: "insight",
                    label: "Insight",
                    description: "",
                    effects: [
                        {
                            type: "add_resource_gain_multiplier",
                            resource: "wood",
                            amount: 0.2,
                            description: "+20% wood",
                        },
                    ],
                },
            },
        });

        expect(breakdown.totalDelta).toBeCloseTo(0.2);
        expect(breakdown.contributions[0]).toMatchObject({
            habitusId: "insight",
            label: "Insight",
        });
    });
});
