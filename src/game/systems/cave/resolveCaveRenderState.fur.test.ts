import { describe, expect, it } from "vitest";
import { DEFAULT_CAVE_DISPLAY_CONFIG } from "../../../data/schemas/game/caveDisplay";
import { resolveCaveRenderState } from "./resolveCaveRenderState";

const attention = {
    targetEntityId: "target",
    targetWorldX: 100,
    targetWorldY: 0,
    lookMode: "track" as const,
    dominantStimulus: "target",
    focusStrength: 0.7,
    candidateIds: ["target"],
};

describe("resolveCaveRenderState fur", () => {
    it("resolves fur levers from comfort, focus, and emotions", () => {
        const config = {
            ...DEFAULT_CAVE_DISPLAY_CONFIG,
            fur: {
                ...DEFAULT_CAVE_DISPLAY_CONFIG.fur,
                lengthPx: {
                    ...DEFAULT_CAVE_DISPLAY_CONFIG.fur.lengthPx,
                    base: 10,
                    comfortWeight: -4,
                    focusWeight: 2,
                    terrorWeight: 6,
                },
            },
        };
        const calm = resolveCaveRenderState(
            {
                targetEntityId: "target",
                targetWorldX: 100,
                targetWorldY: 0,
                lookMode: "track",
                dominantStimulus: "target",
                focusStrength: 0.2,
                candidateIds: ["target"],
            },
            {
                happiness: 0.1,
                sadness: 0.1,
                terror: 0.1,
                curiosity: 0.2,
                worry: 0,
            },
            1,
            0,
            0,
            config,
        );
        const alarmed = resolveCaveRenderState(
            {
                targetEntityId: "target",
                targetWorldX: 100,
                targetWorldY: 0,
                lookMode: "track",
                dominantStimulus: "target",
                focusStrength: 1,
                candidateIds: ["target"],
            },
            {
                happiness: 0.1,
                sadness: 0.1,
                terror: 0.8,
                curiosity: 0.2,
                worry: 0,
            },
            0,
            0,
            0,
            config,
        );
        expect(alarmed.render.fur.lengthPx).toBeGreaterThan(
            calm.render.fur.lengthPx,
        );
        expect(alarmed.render.pupilOffsetX).toBeGreaterThan(
            calm.render.pupilOffsetX,
        );
    });

    it("matches scared fur output for worried mood", () => {
        const worried = resolveCaveRenderState(
            attention,
            {
                happiness: 0.1,
                sadness: 0.1,
                terror: 0,
                curiosity: 0.2,
                worry: 0.8,
            },
            0.2,
            0,
            0,
            DEFAULT_CAVE_DISPLAY_CONFIG,
        );
        const scared = resolveCaveRenderState(
            attention,
            {
                happiness: 0.1,
                sadness: 0.1,
                terror: 0.8,
                curiosity: 0.2,
                worry: 0,
            },
            0.2,
            0,
            0,
            DEFAULT_CAVE_DISPLAY_CONFIG,
        );
        expect(worried.render.fur).toEqual(scared.render.fur);
    });
});
