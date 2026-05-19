import { describe, expect, it } from "vitest";
import { GlyphPlacementSchema, GlyphPresetSchema } from "./glyphs";

const makePulse = () => ({
    distanceFromCenterMinFactor: 0.4,
    distanceFromCenterMaxFactor: 0.8,
    scalePulseMin: 0.9,
    scalePulseMax: 1.1,
    rotationDeltaMinDeg: -5,
    rotationDeltaMaxDeg: 5,
    delayMsByPosition: [0, 61, 0, 62, 0, 63, 0, 64, 0],
});

describe("Glyph schemas", () => {
    const placement = {
        shape: "ring",
        position: 4,
        rotationDeg: 0,
        scale: 1,
        colorHex: "#12abef",
    };

    it("defaults radialPositionFactor to 1", () => {
        expect(GlyphPlacementSchema.parse(placement).radialPositionFactor).toBe(
            1,
        );
    });

    it("defaults reverseDirection to false", () => {
        expect(
            GlyphPlacementSchema.parse({
                ...placement,
                animation: makePulse(),
            }).animation?.reverseDirection,
        ).toBe(false);
    });

    it("accepts arbitrary valid hex colors", () => {
        expect(GlyphPlacementSchema.parse(placement).colorHex).toBe("#12abef");
    });

    it("accepts hole as a valid glyph shape", () => {
        expect(
            GlyphPlacementSchema.parse({ ...placement, shape: "hole" }).shape,
        ).toBe("hole");
    });

    it("rejects invalid hex colors", () => {
        expect(
            GlyphPlacementSchema.safeParse({
                ...placement,
                colorHex: "blue",
            }).success,
        ).toBe(false);
    });

    it("validates placement animation envelopes", () => {
        const parsed = GlyphPresetSchema.safeParse({
            placements: [
                {
                    shape: "ring",
                    position: 4,
                    rotationDeg: 0,
                    scale: 1,
                    colorHex: "#12abef",
                    animation: { ...makePulse(), rotationDeltaMaxDeg: -5 },
                },
            ],
            pulse: makePulse(),
        });
        expect(parsed.success).toBe(false);
    });

    it("accepts integer millisecond delays and rejects out-of-range values", () => {
        expect(
            GlyphPresetSchema.safeParse({
                placements: [placement],
                pulse: makePulse(),
            }).success,
        ).toBe(true);
        expect(
            GlyphPresetSchema.safeParse({
                placements: [placement],
                pulse: {
                    ...makePulse(),
                    delayMsByPosition: [0, 181, 0, 0, 0, 0, 0, 0, 0],
                },
            }).success,
        ).toBe(false);
    });
});
