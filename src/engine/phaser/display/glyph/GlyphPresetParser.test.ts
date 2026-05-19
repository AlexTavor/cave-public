import { describe, it, expect } from "vitest";
import { parsePresets } from "./GlyphPresetParser";

const makeValidPreset = (overrides?: Record<string, any>) => ({
    placements: [
        {
            shape: "ring",
            position: 4,
            rotationDeg: 0,
            scale: 1,
            colorHex: "#000000",
        },
        {
            shape: "line",
            position: 1,
            rotationDeg: 45,
            scale: 0.5,
            colorHex: "#660000",
        },
    ],
    pulse: {
        distanceFromCenterMinFactor: 0.55,
        distanceFromCenterMaxFactor: 0.75,
        scalePulseMin: 0.95,
        scalePulseMax: 1.05,
        rotationDeltaMinDeg: -6,
        rotationDeltaMaxDeg: 6,
        delayMsByPosition: [0, 60, 0, 120, 0, 60, 180, 0, 120],
    },
    ...overrides,
});

describe("GlyphPresetParser", () => {
    it("parses valid presets", () => {
        const raw = {
            keyA: makeValidPreset(),
            keyB: makeValidPreset({
                placements: [
                    {
                        shape: "circle",
                        position: 4,
                        rotationDeg: 0,
                        scale: 1,
                        colorHex: "#006400",
                    },
                ],
                pulse: {
                    ...makeValidPreset().pulse,
                    delayMsByPosition: [60, 0, 0, 0, 0, 0, 0, 0, 0],
                },
            }),
        };
        const result = parsePresets(raw);
        expect(result.presetsByKey.size).toBe(2);
        expect(result.signature).toBeTruthy();
        expect(result.reservedDelaySignatures.size).toBe(2);
    });

    it("throws on invalid shape", () => {
        const raw = {
            bad: makeValidPreset({
                placements: [
                    {
                        shape: "invalid_shape",
                        position: 4,
                        rotationDeg: 0,
                        scale: 1,
                        colorHex: "#000000",
                    },
                ],
            }),
        };
        expect(() => parsePresets(raw)).toThrow("placements.0.shape");
    });

    it("throws on invalid color", () => {
        const raw = {
            bad: makeValidPreset({
                placements: [
                    {
                        shape: "ring",
                        position: 4,
                        rotationDeg: 0,
                        scale: 1,
                        colorHex: "#fff",
                    },
                ],
            }),
        };
        expect(() => parsePresets(raw)).toThrow("colorHex");
    });

    it("throws on duplicate positions within a preset", () => {
        const raw = {
            bad: makeValidPreset({
                placements: [
                    {
                        shape: "ring",
                        position: 4,
                        rotationDeg: 0,
                        scale: 1,
                        colorHex: "#000000",
                    },
                    {
                        shape: "circle",
                        position: 4,
                        rotationDeg: 0,
                        scale: 0.5,
                        colorHex: "#000000",
                    },
                ],
            }),
        };
        expect(() => parsePresets(raw)).toThrow("duplicate position");
    });
});
