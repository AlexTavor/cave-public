import { describe, expect, it } from "vitest";
import { resolveStorageAbilityBars } from "./resolveStorageAbilityBars";

describe("resolveStorageAbilityBars palette colors", () => {
    it("resolves palette colors when the bar uses palette metadata", () => {
        const entity = {
            id: "store-3",
            state: {
                food: {
                    value: 2,
                    max: 8,
                    visible: true,
                    allowDeposit: true,
                    allowWithdraw: true,
                    priority: 1,
                },
            },
            display: {
                bars: [
                    {
                        key: "state.food",
                        maxKey: "state.food.max",
                        paletteColorKey: "body",
                        position: "bottom_left",
                    },
                ],
            },
        } as any;
        const runtime = {
            getCartridge: () => ({
                assets: {
                    settings: {
                        vein_network: { colors: { base_body: "#00ff00" } },
                    },
                },
            }),
        } as any;

        expect(resolveStorageAbilityBars(entity, runtime)[0]?.color).toBe(
            "#00ff00",
        );
    });
});
