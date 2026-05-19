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
    ],
    pulse: {
        distanceFromCenterMinFactor: 0.55,
        distanceFromCenterMaxFactor: 0.75,
        scalePulseMin: 0.95,
        scalePulseMax: 1.05,
        rotationDeltaMinDeg: -6,
        rotationDeltaMaxDeg: 6,
        delayMsByPosition: [0, 61, 0, 120, 0, 62, 180, 0, 119],
    },
    ...overrides,
});

describe("GlyphPresetParser - duplicates & signature", () => {
    it("returns empty for null input", () => {
        expect(parsePresets(null).presetsByKey.size).toBe(0);
    });

    it("throws on duplicate canonical configs between keys", () => {
        const preset = makeValidPreset();
        const raw = { k1: preset, k2: { ...preset } };
        expect(() => parsePresets(raw)).toThrow("duplicate canonical");
    });

    it("signature is stable regardless of key order", () => {
        const p1 = makeValidPreset();
        const p2 = makeValidPreset({
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
                ...p1.pulse,
                delayMsByPosition: [61, 0, 0, 0, 0, 0, 0, 0, 0],
            },
        });
        const rawA = { alpha: p1, beta: p2 };
        const rawB = { beta: p2, alpha: p1 };
        const sigA = parsePresets(rawA).signature;
        const sigB = parsePresets(rawB).signature;
        expect(sigA).toBe(sigB);
    });

    it("throws on pulse min >= max", () => {
        const raw = {
            bad: makeValidPreset({
                pulse: {
                    ...makeValidPreset().pulse,
                    scalePulseMin: 1.05,
                    scalePulseMax: 0.95,
                },
            }),
        };
        expect(() => parsePresets(raw)).toThrow("scaleMin must < scaleMax");
    });

    it("throws on invalid delay values", () => {
        const raw = {
            bad: makeValidPreset({
                pulse: {
                    ...makeValidPreset().pulse,
                    delayMsByPosition: [0, 61, 0, 120, 0, 62, 180, 0, 181],
                },
            }),
        };
        expect(() => parsePresets(raw)).toThrow("<=180");
    });
});
