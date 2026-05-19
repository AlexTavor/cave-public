import { describe, expect, it } from "vitest";
import { resolveSelectionLens } from "./selectionLensMap";

describe("selectionLensMap resource", () => {
    it("matches resource entities from visible storage bars", () => {
        const lens = resolveSelectionLens(
            {
                id: "store-1",
                display: {
                    bars: [{ key: "state.wood", maxKey: "state.wood.max" }],
                },
                state: {
                    wood: {
                        value: 3,
                        max: 9,
                        visible: false,
                        allowDeposit: true,
                    },
                },
            } as any,
            null,
        );

        expect(lens?.id).toBe("resource");
    });

    it("does not match entities with numeric state but no storage metadata", () => {
        expect(
            resolveSelectionLens(
                {
                    id: "other-1",
                    display: {
                        bars: [
                            { key: "state.cycle", maxKey: "state.cycle.max" },
                        ],
                    },
                    state: { cycle: { value: 1, max: 2, visible: true } },
                } as any,
                null,
            )?.id,
        ).not.toBe("resource");
    });
});
