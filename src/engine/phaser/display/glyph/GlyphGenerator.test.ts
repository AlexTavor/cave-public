import { describe, it, expect } from "vitest";
import { generateGlyph } from "./GlyphGenerator";
import { ALL_GLYPH_SHAPES } from "./GlyphTypes";
import { canonicalKey } from "./glyphCanonical";

describe("GlyphGenerator", () => {
    it("is deterministic: same seed+ordinal produces same config", () => {
        const a = generateGlyph("seed-A", 7);
        const b = generateGlyph("seed-A", 7);
        expect(canonicalKey(a)).toBe(canonicalKey(b));
    });

    it("different ordinals produce different delay arrays", () => {
        const a = generateGlyph("seed-A", 0);
        const b = generateGlyph("seed-A", 1);
        expect(a.pulse.delayMsByPosition).not.toEqual(
            b.pulse.delayMsByPosition,
        );
    });

    it("produces valid placement count 1..5", () => {
        for (let i = 0; i < 50; i++) {
            const g = generateGlyph("test", i);
            expect(g.placements.length).toBeGreaterThanOrEqual(1);
            expect(g.placements.length).toBeLessThanOrEqual(5);
        }
    });

    it("all positions are 0..8 and unique within glyph", () => {
        for (let i = 0; i < 50; i++) {
            const g = generateGlyph("test", i);
            const positions = g.placements.map((p) => p.position);
            const unique = new Set(positions);
            expect(unique.size).toBe(positions.length);
            for (const p of positions) {
                expect(p).toBeGreaterThanOrEqual(0);
                expect(p).toBeLessThanOrEqual(8);
            }
        }
    });

    it("shapes are valid GlyphShape values", () => {
        const validSet = new Set<string>(ALL_GLYPH_SHAPES);
        for (let i = 0; i < 50; i++) {
            const g = generateGlyph("test", i);
            for (const p of g.placements) {
                expect(validSet.has(p.shape)).toBe(true);
            }
        }
    });
});
