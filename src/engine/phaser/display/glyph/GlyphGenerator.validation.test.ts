import { describe, it, expect } from "vitest";
import { generateGlyph } from "./GlyphGenerator";
import { PALETTE } from "../../../../data/schemas/assets/GlyphTypes";
import {
    ROTATION_SETS,
    SAT_SCALE_CHOICES,
    CORE_SCALE,
} from "./glyphGenConstants";

const VALID_DELAYS = new Set([0, 60, 120, 180]);
const PALETTE_SET = new Set<string>(PALETTE);

describe("GlyphGenerator - colors, rotations, scales, pulse", () => {
    it("colors are from the palette", () => {
        for (let i = 0; i < 50; i++) {
            const g = generateGlyph("test", i);
            for (const p of g.placements) {
                expect(PALETTE_SET.has(p.colorHex)).toBe(true);
            }
        }
    });

    it("rotations are from valid rotation sets", () => {
        for (let i = 0; i < 50; i++) {
            const g = generateGlyph("test", i);
            for (const p of g.placements) {
                const allowed = ROTATION_SETS[p.shape];
                expect(allowed).toContain(p.rotationDeg);
            }
        }
    });

    it("core scale is 1.0, satellite scales from choices", () => {
        for (let i = 0; i < 50; i++) {
            const g = generateGlyph("test", i);
            const core = g.placements.find((p) => p.position === 4);
            if (core === undefined) continue;
            expect(core.scale).toBe(CORE_SCALE);
            const sats = g.placements.filter((p) => p.position !== 4);
            for (const s of sats) {
                expect(SAT_SCALE_CHOICES as readonly number[]).toContain(
                    s.scale,
                );
            }
        }
    });

    it("pulse min < max for all ranges", () => {
        for (let i = 0; i < 50; i++) {
            const g = generateGlyph("test", i);
            const p = g.pulse;
            expect(p.distanceFromCenterMinFactor).toBeLessThan(
                p.distanceFromCenterMaxFactor,
            );
            expect(p.scalePulseMin).toBeLessThan(p.scalePulseMax);
            expect(p.rotationDeltaMinDeg).toBeLessThan(p.rotationDeltaMaxDeg);
        }
    });

    it("delay array is length 9 with valid values", () => {
        for (let i = 0; i < 50; i++) {
            const g = generateGlyph("test", i);
            expect(g.pulse.delayMsByPosition).toHaveLength(9);
            for (const d of g.pulse.delayMsByPosition) {
                expect(VALID_DELAYS.has(d)).toBe(true);
            }
        }
    });
});
