import { describe, expect, it } from "vitest";
import { resolveGlyphPlacementTransform } from "./glyphRenderMath";
import type { GlyphPlacement, GlyphPulseConfig } from "../../../../data/schemas/assets/GlyphTypes";

const makePulse = (
    overrides?: Partial<GlyphPulseConfig>,
): GlyphPulseConfig => ({
    distanceFromCenterMinFactor: 0.5,
    distanceFromCenterMaxFactor: 0.8,
    scalePulseMin: 0.96,
    scalePulseMax: 1.04,
    rotationDeltaMinDeg: -4,
    rotationDeltaMaxDeg: 4,
    delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ...overrides,
});

const makePlacement = (
    overrides?: Partial<GlyphPlacement>,
): GlyphPlacement => ({
    shape: "ring",
    position: 4,
    rotationDeg: 0,
    scale: 1,
    colorHex: "#000000",
    ...overrides,
});

describe("glyphRenderMath", () => {
    it("center position (4) yields x=0, y=0", () => {
        const t = resolveGlyphPlacementTransform({
            radius: 100,
            placement: makePlacement(),
            pulse: makePulse(),
            pulseValue: 0.5,
        });
        expect(t.xPx).toBe(0);
        expect(t.yPx).toBe(0);
    });

    it("position 5 (1,0) yields x = d", () => {
        const pulse = makePulse({
            distanceFromCenterMinFactor: 0.6,
            distanceFromCenterMaxFactor: 0.6,
        });
        const t = resolveGlyphPlacementTransform({
            radius: 100,
            placement: makePlacement({ position: 5 }),
            pulse,
            pulseValue: 0,
        });
        expect(t.xPx).toBeCloseTo(60);
        expect(t.yPx).toBeCloseTo(0);
    });

    it("scale normalization with placement.scale=0.5", () => {
        const pulse = makePulse({
            distanceFromCenterMinFactor: 0.6,
            distanceFromCenterMaxFactor: 0.6,
            scalePulseMin: 1,
            scalePulseMax: 1,
        });
        const t = resolveGlyphPlacementTransform({
            radius: 100,
            placement: makePlacement({ scale: 0.5 }),
            pulse,
            pulseValue: 0,
        });
        const d = 60;
        const expected = (d * 0.9 * 0.5 * 1) / 128;
        expect(t.imageScale).toBeCloseTo(expected);
    });

    it("radialPositionFactor changes orbit but not image scale", () => {
        const pulse = makePulse({
            distanceFromCenterMinFactor: 0.6,
            distanceFromCenterMaxFactor: 0.6,
            scalePulseMin: 1,
            scalePulseMax: 1,
        });
        const full = resolveGlyphPlacementTransform({
            radius: 100,
            placement: makePlacement({ position: 5, radialPositionFactor: 1 }),
            pulse,
            pulseValue: 0,
        });
        const half = resolveGlyphPlacementTransform({
            radius: 100,
            placement: makePlacement({
                position: 5,
                radialPositionFactor: 0.5,
            }),
            pulse,
            pulseValue: 0,
        });
        expect(half.xPx).toBeCloseTo(full.xPx / 2);
        expect(half.imageScale).toBeCloseTo(full.imageScale);
    });

    it("pulse p=0 uses min, p=1 uses max", () => {
        const pulse = makePulse();
        const t0 = resolveGlyphPlacementTransform({
            radius: 100,
            placement: makePlacement(),
            pulse,
            pulseValue: 0,
        });
        const t1 = resolveGlyphPlacementTransform({
            radius: 100,
            placement: makePlacement(),
            pulse,
            pulseValue: 1,
        });
        expect(t0.rotationDeg).toBeCloseTo(-4);
        expect(t1.rotationDeg).toBeCloseTo(4);
    });
});
