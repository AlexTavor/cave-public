import { describe, expect, it } from "vitest";
import { resolveStorageAbilityBars } from "./resolveStorageAbilityBars";

describe("resolveStorageAbilityBars cycle costs", () => {
    it("dedupes authored bars while preserving cycle-cost max bindings", () => {
        const bars = resolveStorageAbilityBars(
            {
                id: "forge",
                display: {
                    bars: [
                        {
                            key: "state.food",
                            maxKey: "state.vals_cycle_cost_total_food.value",
                            label: "Food",
                            color: "#1",
                        },
                        {
                            key: "state.food",
                            maxKey: "state.vals_cycle_cost_total_food.value",
                            label: "Food",
                            color: "#1",
                        },
                    ],
                },
                state: {
                    food: {
                        value: 2,
                        allowDeposit: true,
                        allowWithdraw: false,
                        priority: 4,
                    },
                    vals_cycle_cost_total_food: { value: 5 },
                },
            } as any,
            null,
        );
        expect(bars).toHaveLength(1);
        expect(bars[0]).toMatchObject({
            maxPath: "state.vals_cycle_cost_total_food.value",
            tooltipLines: expect.arrayContaining(["Priority: 4"]),
        });
    });
});
