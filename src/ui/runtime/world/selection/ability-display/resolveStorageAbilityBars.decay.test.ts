import { describe, expect, it } from "vitest";
import { resolveStorageAbilityBars } from "./resolveStorageAbilityBars";

const makeEntity = (state: Record<string, unknown>) =>
    ({
        id: "store-1",
        display: {
            bars: [
                {
                    key: "state.food",
                    maxKey: "state.food.max",
                    label: "Food",
                    color: "#1",
                },
            ],
        },
        state,
    }) as any;

describe("resolveStorageAbilityBars decay", () => {
    it("sums live decay across compiled entropy entries for one resource", () => {
        const [bar] = resolveStorageAbilityBars(
            makeEntity({
                food: {
                    value: 12,
                    max: 20,
                    allowDeposit: true,
                    allowWithdraw: true,
                    priority: 1,
                },
                vals_entropy_food_0: { value: 0.5 },
                vals_entropy_food_1: { value: 1.25 },
            }),
            null,
        );

        expect(bar.titleMetaText).toBe("1.75/s");
        expect(bar.tooltipLines).toContain("Decay: 1.75/s");
    });

    it("omits decay text when total decay is zero", () => {
        const [bar] = resolveStorageAbilityBars(
            makeEntity({
                food: {
                    value: 12,
                    max: 20,
                    allowDeposit: true,
                    allowWithdraw: true,
                    priority: 1,
                },
                vals_entropy_food_0: { value: 1 },
                vals_entropy_food_1: { value: -1 },
            }),
            null,
        );

        expect(bar.titleMetaText).toBeUndefined();
        expect(bar.tooltipLines.some((line) => line.startsWith("Decay:"))).toBe(
            false,
        );
    });

    it("ignores unrelated entropy keys", () => {
        const [bar] = resolveStorageAbilityBars(
            makeEntity({
                food: {
                    value: 12,
                    max: 20,
                    allowDeposit: true,
                    allowWithdraw: true,
                    priority: 1,
                },
                vals_entropy_heat_0: { value: 3 },
            }),
            null,
        );

        expect(bar.titleMetaText).toBeUndefined();
    });
});
