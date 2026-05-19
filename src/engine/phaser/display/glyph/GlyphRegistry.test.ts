import { describe, it, expect } from "vitest";
import { GlyphRegistry } from "./GlyphRegistry";
import { canonicalKey } from "./glyphCanonical";

describe("GlyphRegistry", () => {
    it("same key returns same glyph", () => {
        const reg = new GlyphRegistry();
        reg.syncEpoch("seed", undefined);
        const a = reg.get("key-a");
        const b = reg.get("key-a");
        expect(a).toBe(b);
    });

    it("different keys produce unique canonical configs", () => {
        const reg = new GlyphRegistry();
        reg.syncEpoch("seed", undefined);
        const keys = new Set<string>();
        for (let i = 0; i < 500; i++) {
            const glyph = reg.get(`key-${i}`);
            const ck = canonicalKey(glyph);
            expect(keys.has(ck)).toBe(false);
            keys.add(ck);
        }
    });

    it("preset takes precedence over procedural", () => {
        const reg = new GlyphRegistry();
        const preset = {
            presetKey: {
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
                    delayMsByPosition: [0, 60, 0, 120, 0, 60, 180, 0, 120],
                },
            },
        };
        reg.syncEpoch("seed", preset);
        const glyph = reg.get("presetKey");
        expect(glyph.placements[0].shape).toBe("ring");
        expect(glyph.id).toBe("presetKey");
    });

    it("epoch reset clears cache", () => {
        const reg = new GlyphRegistry();
        reg.syncEpoch("seed-a", undefined);
        const a = reg.get("k");
        reg.syncEpoch("seed-b", undefined);
        const b = reg.get("k");
        expect(a).not.toBe(b);
    });

    it("same seed and preset object preserves cached glyph identity", () => {
        const reg = new GlyphRegistry();
        const preset = {
            presetKey: {
                placements: [
                    {
                        shape: "ring",
                        position: 4,
                        rotationDeg: 0,
                        scale: 1,
                        colorHex: "#ffffff",
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
            },
        };
        reg.syncEpoch("seed", preset);
        const first = reg.get("presetKey");
        reg.syncEpoch("seed", preset);
        expect(reg.get("presetKey")).toBe(first);
    });
});
