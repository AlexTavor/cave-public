import { describe, expect, it } from "vitest";
import { DEFAULT_BACKGROUND_CONFIG } from "../../../data/schemas/assets";
import { resolveBiologicalFogUniforms } from "./resolveBiologicalFogUniforms";

describe("resolveBiologicalFogUniforms", () => {
    it("maps config and scene state into serializable shader uniforms", () => {
        const uniforms = resolveBiologicalFogUniforms({
            config: { ...DEFAULT_BACKGROUND_CONFIG, enabled: true },
            purgeActive: false,
            timeMs: 1200,
            pulse01: 1.5,
            cameraScrollX: 12,
            cameraScrollY: 24,
            cameraZoom: 2,
            viewportWidth: 800,
            viewportHeight: 600,
        });

        expect(uniforms).toEqual({
            resolution: { x: 400, y: 300 },
            cameraScroll: { x: 12, y: 24 },
            cameraZoom: 2,
            timeMs: 1200,
            pulse01: 1,
            baseColor: [192 / 255, 146 / 255, 238 / 255],
            liftColor: [104 / 255, 16 / 255, 176 / 255],
            intensity: 0.8,
            largeScale: 0.0028,
            smallScale: 0.0065,
            largeDrift: { x: 0.000025, y: -0.00001 },
            smallDrift: { x: -0.000013, y: 0.000018 },
            thresholdLow: 0.3,
            thresholdHigh: 0.72,
            heartbeatAmplitude: 0.025,
        });
    });

    it("tints only the base color toward red while Purge is active", () => {
        const uniforms = resolveBiologicalFogUniforms({
            config: DEFAULT_BACKGROUND_CONFIG,
            purgeActive: true,
            timeMs: 0,
            pulse01: 1,
            cameraScrollX: 0,
            cameraScrollY: 0,
            cameraZoom: 1,
            viewportWidth: 1,
            viewportHeight: 1,
        });

        expect(uniforms.baseColor).toEqual([
            0.79, 0.48666666666666664, 0.7933333333333333,
        ]);
        expect(uniforms.liftColor).toEqual([104 / 255, 16 / 255, 176 / 255]);
    });

    it("fails loudly for non-hex color strings", () => {
        expect(() =>
            resolveBiologicalFogUniforms({
                config: { ...DEFAULT_BACKGROUND_CONFIG, base_color: "moss" },
                purgeActive: false,
                timeMs: 0,
                pulse01: 0,
                cameraScrollX: 0,
                cameraScrollY: 0,
                cameraZoom: 1,
                viewportWidth: 1,
                viewportHeight: 1,
            }),
        ).toThrow("Invalid biological fog color");
    });
});
