import { describe, expect, it } from "vitest";
import { canonicalKey } from "./glyphCanonical";
import { parsePresets } from "./GlyphPresetParser";
import type { GlyphConfigWithoutId } from "./GlyphGenerator";

const pulse = {
    distanceFromCenterMinFactor: 0.4,
    distanceFromCenterMaxFactor: 0.8,
    scalePulseMin: 0.9,
    scalePulseMax: 1.1,
    rotationDeltaMinDeg: -5,
    rotationDeltaMaxDeg: 5,
    delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0],
};

describe("GlyphPresetParser canonical defaults", () => {
    it("normalizes missing radialPositionFactor to 1", () => {
        const parsed = parsePresets({
            sample: {
                placements: [
                    {
                        shape: "ring",
                        position: 4,
                        rotationDeg: 0,
                        scale: 1,
                        colorHex: "#12abef",
                    },
                ],
                pulse,
            },
        });
        expect(
            parsed.presetsByKey.get("sample")?.placements[0]
                .radialPositionFactor,
        ).toBe(1);
    });

    it("treats explicit slot overrides matching the global pulse as canonically identical", () => {
        const implicit: GlyphConfigWithoutId = {
            placements: [
                {
                    shape: "ring",
                    position: 4,
                    rotationDeg: 0,
                    scale: 1,
                    colorHex: "#12abef",
                    radialPositionFactor: 1,
                },
            ],
            pulse,
        };
        const explicit: GlyphConfigWithoutId = {
            placements: [
                {
                    shape: "ring",
                    position: 4,
                    rotationDeg: 0,
                    scale: 1,
                    colorHex: "#12abef",
                    radialPositionFactor: 1,
                    animation: {
                        distanceFromCenterMinFactor: 0.4,
                        distanceFromCenterMaxFactor: 0.8,
                        scalePulseMin: 0.9,
                        scalePulseMax: 1.1,
                        rotationDeltaMinDeg: -5,
                        rotationDeltaMaxDeg: 5,
                    },
                },
            ],
            pulse,
        };
        expect(canonicalKey(implicit)).toBe(canonicalKey(explicit));
    });
});
