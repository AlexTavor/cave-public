import { describe, expect, it } from "vitest";
import { resolveStorageAbilityBars } from "./resolveStorageAbilityBars";

describe("resolveStorageAbilityBars", () => {
    it("resolves storage from blueprint display bars even when state is hidden", () => {
        // Given
        const entity = {
            id: "store-1",
            state: {
                wood: {
                    value: 12,
                    max: 20,
                    visible: true,
                    allowDeposit: true,
                    allowWithdraw: true,
                    priority: 1,
                },
                heat: {
                    value: 3,
                    max: 9,
                    visible: false,
                    allowDeposit: true,
                    allowWithdraw: false,
                    priority: 2,
                },
            },
        } as any;
        const runtime = {
            getCartridge: () => ({
                blueprints: {
                    store_bp: {
                        components: {
                            display: {
                                bars: [
                                    {
                                        key: "state.wood",
                                        maxKey: "state.wood.max",
                                        label: "Timber",
                                        color: "#1",
                                    },
                                    {
                                        key: "state.heat",
                                        maxKey: "state.heat.max",
                                        label: "Heat",
                                        color: "#2",
                                    },
                                ],
                            },
                        },
                    },
                },
            }),
        } as any;

        // When / Then
        expect(
            resolveStorageAbilityBars(
                { ...entity, blueprintId: "store_bp" },
                runtime,
            ),
        ).toEqual([
            expect.objectContaining({
                title: "Timber",
                iconId: "wood",
                color: "#1",
                valueBinding: expect.objectContaining({
                    kind: "compact-fraction",
                    valuePath: "state.wood.value",
                    maxPath: "state.wood.max",
                }),
            }),
            expect.objectContaining({
                title: "Heat",
                iconId: "heat",
                color: "#2",
                valueBinding: expect.objectContaining({
                    kind: "compact-fraction",
                    valuePath: "state.heat.value",
                    maxPath: "state.heat.max",
                }),
            }),
        ]);
    });

    it("prefers live display bars and ignores non-storage entries", () => {
        // Given
        const entity = {
            id: "store-2",
            display: {
                bars: [
                    {
                        key: "state.cycle",
                        maxKey: "state.cycle.max",
                        label: "Cycle",
                    },
                ],
            },
            state: { cycle: { value: 1, max: 2, visible: true } },
        } as any;

        // When / Then
        expect(resolveStorageAbilityBars(entity, null)).toEqual([]);
    });
});
