import { describe, expect, it } from "vitest";
import { DEFAULT_CAVE_DISPLAY_CONFIG } from "../../../data/schemas/game/caveDisplay";
import { resolveCaveRenderState } from "./resolveCaveRenderState";

const idleAttention = {
    targetEntityId: "",
    targetWorldX: 0,
    targetWorldY: 0,
    lookMode: "idle" as const,
    dominantStimulus: "idle",
    focusStrength: 0,
    candidateIds: [],
};

describe("resolveCaveRenderState pulse", () => {
    it("preserves pulse preset selection", () => {
        expect(
            resolveCaveRenderState(
                idleAttention,
                {
                    happiness: 0.1,
                    sadness: 0.1,
                    terror: 0.8,
                    curiosity: 0.2,
                    worry: 0,
                },
                0.5,
                0,
                0,
                DEFAULT_CAVE_DISPLAY_CONFIG,
            ).pulsePresetKey,
        ).toBe("panic");
        expect(
            resolveCaveRenderState(
                idleAttention,
                {
                    happiness: 0.1,
                    sadness: 0.8,
                    terror: 0.1,
                    curiosity: 0.2,
                    worry: 0,
                },
                0.5,
                0,
                0,
                DEFAULT_CAVE_DISPLAY_CONFIG,
            ).pulsePresetKey,
        ).toBe("frozen");
        expect(
            resolveCaveRenderState(
                idleAttention,
                {
                    happiness: 0.8,
                    sadness: 0.1,
                    terror: 0.1,
                    curiosity: 0.2,
                    worry: 0,
                },
                0.5,
                0,
                0,
                DEFAULT_CAVE_DISPLAY_CONFIG,
            ).pulsePresetKey,
        ).toBe("healthy");
        expect(
            resolveCaveRenderState(
                idleAttention,
                {
                    happiness: 0.1,
                    sadness: 0.1,
                    terror: 0,
                    curiosity: 0.2,
                    worry: 0.8,
                },
                0.5,
                0,
                0,
                DEFAULT_CAVE_DISPLAY_CONFIG,
            ).pulsePresetKey,
        ).toBe("panic");
    });
});
