import { describe, expect, it } from "vitest";
import { resolveGlyphPlacementTransform } from "./glyphRenderMath";
import type { GlyphPlacement, GlyphPulseConfig } from "../../../../data/schemas/assets/GlyphTypes";

const makePulse = (): GlyphPulseConfig => ({
    distanceFromCenterMinFactor: 0.5,
    distanceFromCenterMaxFactor: 0.8,
    scalePulseMin: 0.96,
    scalePulseMax: 1.04,
    rotationDeltaMinDeg: -4,
    rotationDeltaMaxDeg: 4,
    delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0],
});

const makePlacement = (): GlyphPlacement => ({
    shape: "ring",
    position: 4,
    rotationDeg: 0,
    scale: 1,
    colorHex: "#000000",
    animation: { ...makePulse(), reverseDirection: true },
});

describe("glyphRenderMath reverseDirection", () => {
    it("uses 1 - pulse when reverse direction is enabled", () => {
        const t = resolveGlyphPlacementTransform({
            radius: 100,
            placement: makePlacement(),
            pulse: makePulse(),
            pulseValue: 0.25,
        });
        expect(t.rotationDeg).toBeCloseTo(2);
    });
});
