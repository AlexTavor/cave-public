import { describe, it, expect } from "vitest";
import { GlyphRegistry } from "./GlyphRegistry";
import { serializeDelaySignature } from "./glyphDelaySignature";

describe("GlyphRegistry - skips & capacity", () => {
    it("procedural skips reserved delay signatures", () => {
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
                    delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0],
                },
            },
        };
        reg.syncEpoch("seed", preset);
        const reservedSig = serializeDelaySignature([
            0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]);
        for (let i = 0; i < 20; i++) {
            const g = reg.get(`proc-${i}`);
            const sig = serializeDelaySignature(g.pulse.delayMsByPosition);
            expect(sig).not.toBe(reservedSig);
        }
    });

    it("clear resets all state", () => {
        const reg = new GlyphRegistry();
        reg.syncEpoch("seed", undefined);
        reg.get("k");
        reg.clear();
        // After clear, syncEpoch with same seed works (no epoch cache hit)
        reg.syncEpoch("seed", undefined);
        const g = reg.get("k");
        expect(g).toBeDefined();
    });

    it("idempotent syncEpoch does not reset cache", () => {
        const reg = new GlyphRegistry();
        reg.syncEpoch("seed", undefined);
        const a = reg.get("k");
        reg.syncEpoch("seed", undefined);
        const b = reg.get("k");
        expect(a).toBe(b);
    });

    it("thickness change resets cache with same preset object", () => {
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
                    rotationDeltaMinDeg: -1,
                    rotationDeltaMaxDeg: 1,
                    delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0],
                },
            },
        };
        reg.syncEpoch("seed", preset, {
            glyph_view: { defaultLineThickness: 8 },
        });
        const first = reg.get("presetKey");
        reg.syncEpoch("seed", preset, {
            glyph_view: { defaultLineThickness: 12 },
        });
        expect(reg.getDefaultLineThickness()).toBe(12);
        expect(reg.get("presetKey")).not.toBe(first);
    });
});
