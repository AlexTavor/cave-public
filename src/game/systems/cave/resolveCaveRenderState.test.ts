import { describe, expect, it } from "vitest";
import { DEFAULT_CAVE_DISPLAY_CONFIG } from "../../../data/schemas/game/caveDisplay";
import { resolveCaveRenderState } from "./resolveCaveRenderState";

const emotions = {
    happiness: 0.1,
    sadness: 0.1,
    terror: 0.1,
    curiosity: 0.2,
    worry: 0,
};

describe("resolveCaveRenderState", () => {
    it("advances idle drift phases and produces visible eye motion", () => {
        const result = resolveCaveRenderState(
            {
                targetEntityId: "",
                targetWorldX: 0,
                targetWorldY: 0,
                lookMode: "idle",
                dominantStimulus: "idle",
                focusStrength: 0,
                candidateIds: [],
            },
            emotions,
            0.5,
            0,
            0,
            DEFAULT_CAVE_DISPLAY_CONFIG,
        );
        expect(result.memoryPatch.eyeDriftPhaseX).not.toBe(0);
        expect(result.render.fur).toBeDefined();
        expect(result.render.eyeOffsetX).not.toBe(0);
        expect(result.render.pupilOffsetX).toBe(0);
        expect(Math.abs(result.render.eyeOffsetX)).toBeLessThan(0.2);
    });

    it("matches curious eye outputs for worried mood", () => {
        const attention = {
            targetEntityId: "target",
            targetWorldX: 100,
            targetWorldY: 0,
            lookMode: "track" as const,
            dominantStimulus: "target",
            focusStrength: 0.6,
            candidateIds: ["target"],
        };
        const curious = resolveCaveRenderState(
            attention,
            {
                happiness: 0.1,
                sadness: 0.1,
                terror: 0.1,
                curiosity: 0.7,
                worry: 0,
            },
            0.5,
            0,
            0,
            DEFAULT_CAVE_DISPLAY_CONFIG,
            0.2,
            0.4,
        );
        const worried = resolveCaveRenderState(
            attention,
            {
                happiness: 0.1,
                sadness: 0.1,
                terror: 0.1,
                curiosity: 0.2,
                worry: 0.7,
            },
            0.5,
            0,
            0,
            DEFAULT_CAVE_DISPLAY_CONFIG,
            0.2,
            0.4,
        );
        expect(worried.render.eyeShape).toBe(curious.render.eyeShape);
        expect(worried.render.eyeColor).toBe(curious.render.eyeColor);
        expect(worried.render.pupilSize).toBe(curious.render.pupilSize);
    });
});
