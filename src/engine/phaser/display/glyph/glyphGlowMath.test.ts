import { describe, it, expect } from "vitest";
import { resolveGlyphGlowPasses } from "./glyphGlowMath";

describe("resolveGlyphGlowPasses", () => {
    it("returns the baked pass list in deterministic outer-to-inner order", () => {
        const passes = resolveGlyphGlowPasses();
        expect(passes).toHaveLength(8);
        expect(passes.map((pass) => pass.outsetPx)).toEqual([
            8, 7, 6, 5, 4, 3, 2, 1,
        ]);
        expect(passes.map((pass) => pass.alpha)).toEqual([
            0.012, 0.018, 0.026, 0.036, 0.048, 0.062, 0.078, 0.096,
        ]);
        expect(passes.reduce((sum, pass) => sum + pass.alpha, 0)).toBeCloseTo(
            0.376,
        );
    });
});
