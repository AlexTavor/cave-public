import { describe, expect, it } from "vitest";
import { resolveSelectionLens } from "./selectionLensMap";

describe("selectionLensMap resource flyweight", () => {
    it("matches resource entities from blueprint-owned storage bars", () => {
        // Given / When
        const lens = resolveSelectionLens(
            {
                id: "store-1",
                blueprintId: "store-1",
                state: {
                    wood: {
                        value: 3,
                        max: 9,
                        visible: false,
                        allowDeposit: true,
                    },
                },
            } as any,
            {
                getCartridge: () => ({
                    blueprints: {
                        "store-1": {
                            components: {
                                display: {
                                    bars: [
                                        {
                                            key: "state.wood",
                                            maxKey: "state.wood.max",
                                        },
                                    ],
                                },
                            },
                        },
                    },
                }),
            } as any,
        );

        // Then
        expect(lens?.id).toBe("resource");
    });
});
