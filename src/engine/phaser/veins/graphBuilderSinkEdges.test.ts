import { describe, expect, it } from "vitest";
import { hasSinkDemand } from "./graphBuilderSinkEdges";

describe("graphBuilderSinkEdges", () => {
    it("reads allocated draw even when base demand is omitted", () => {
        expect(
            hasSinkDemand(
                { allocatedDraw: { body: 1, mind: 0, social: 0 } } as never,
                "body",
            ),
        ).toBe(true);
    });

    it("treats missing demand fields as zero", () => {
        expect(hasSinkDemand({} as never, "body")).toBe(false);
    });
});
