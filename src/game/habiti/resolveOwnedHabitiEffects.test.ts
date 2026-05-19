import { describe, expect, it, vi } from "vitest";
import { resolveOwnedHabitiEffects } from "./resolveOwnedHabitiEffects";

describe("resolveOwnedHabitiEffects", () => {
    it("aggregates producer-tag bonuses without changing resource aggregation", () => {
        const resolved = resolveOwnedHabitiEffects({
            ownedHabiti: ["woods", "smith"],
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
                            type: "add_producer_output_multiplier",
                            producerTag: "artisan",
                            amount: 0.25,
                            description: "+25% artisan",
                        },
                    ],
                },
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
                            description: "+10% wood",
                        },
                    ],
                },
            },
        });
        expect(resolved.resourceGainMultipliers).toEqual({ wood: 0.1 });
        expect(resolved.producerOutputTagMultipliers).toEqual({
            artisan: 0.25,
        });
    });

    it("reports unknown ids without crashing", () => {
        const onUnknownId = vi.fn();
        resolveOwnedHabitiEffects({
            ownedHabiti: ["missing"],
            habitusIndex: {},
            onUnknownId,
        });
        expect(onUnknownId).toHaveBeenCalledWith("missing");
    });
});
