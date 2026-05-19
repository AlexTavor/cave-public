import { describe, expect, it } from "vitest";
import { resolveSelectionLens } from "./selectionLensMap";

describe("selectionLensMap transfer", () => {
    it("prefers the transfer lens for pending transfer nodes", () => {
        const lens = resolveSelectionLens(
            {
                id: "pending_1",
                tags: ["pending_transfer"],
                transfer: {
                    payload: { wood: 50 },
                    sourceId: "a",
                    targetId: "b",
                },
            } as never,
            null,
        );

        expect(lens?.id).toBe("transfer");
    });
});
