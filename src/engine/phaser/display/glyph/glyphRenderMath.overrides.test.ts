import { describe, expect, it } from "vitest";
import { resolveGlyphPlacementTransform } from "./glyphRenderMath";

const pulse = {
    distanceFromCenterMinFactor: 0.4,
    distanceFromCenterMaxFactor: 0.8,
    scalePulseMin: 0.9,
    scalePulseMax: 1.1,
    rotationDeltaMinDeg: -5,
    rotationDeltaMaxDeg: 5,
    delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0],
};

describe("glyphRenderMath overrides", () => {
    it("places non-center slots at the center when radialPositionFactor is 0", () => {
        const result = resolveGlyphPlacementTransform({
            radius: 100,
            placement: {
                shape: "ring",
                position: 5,
                rotationDeg: 0,
                scale: 1,
                colorHex: "#000000",
                radialPositionFactor: 0,
            },
            pulse,
            pulseValue: 1,
        });
        expect(result.xPx).toBe(0);
        expect(result.yPx).toBe(0);
    });

    it("preserves the old orbit when radialPositionFactor is 1", () => {
        const result = resolveGlyphPlacementTransform({
            radius: 100,
            placement: {
                shape: "ring",
                position: 5,
                rotationDeg: 0,
                scale: 1,
                colorHex: "#000000",
                radialPositionFactor: 1,
            },
            pulse,
            pulseValue: 0.5,
        });
        expect(result.xPx).toBeCloseTo(60);
    });

    it("uses placement animation overrides instead of global pulse defaults", () => {
        const result = resolveGlyphPlacementTransform({
            radius: 100,
            placement: {
                shape: "ring",
                position: 5,
                rotationDeg: 10,
                scale: 1,
                colorHex: "#000000",
                radialPositionFactor: 1,
                animation: {
                    distanceFromCenterMinFactor: 0.2,
                    distanceFromCenterMaxFactor: 0.2,
                    scalePulseMin: 1.5,
                    scalePulseMax: 1.5,
                    rotationDeltaMinDeg: 20,
                    rotationDeltaMaxDeg: 20,
                },
            },
            pulse,
            pulseValue: 0,
        });
        expect(result.xPx).toBeCloseTo(20);
        expect(result.rotationDeg).toBe(30);
    });

    it("still multiplies base placement scale by the effective pulse scale", () => {
        const result = resolveGlyphPlacementTransform({
            radius: 100,
            placement: {
                shape: "ring",
                position: 5,
                rotationDeg: 0,
                scale: 2,
                colorHex: "#000000",
                radialPositionFactor: 1,
                animation: {
                    distanceFromCenterMinFactor: 0.5,
                    distanceFromCenterMaxFactor: 0.5,
                    scalePulseMin: 1.5,
                    scalePulseMax: 1.5,
                    rotationDeltaMinDeg: 0,
                    rotationDeltaMaxDeg: 0,
                },
            },
            pulse,
            pulseValue: 0,
        });
        expect(result.imageScale).toBeCloseTo((50 * 0.9 * 2 * 1.5) / 128);
    });
});
