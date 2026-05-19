import { describe, expect, it } from "vitest";
import { DEFAULT_CAVE_DISPLAY_CONFIG } from "../../../data/schemas/game/caveDisplay";
import { resolveCaveRenderState } from "./resolveCaveRenderState";

describe("resolveCaveRenderState happy boundary", () => {
    it("uses the comfort boundary for eye-shape happiness", () => {
        expect(
            resolveCaveRenderState(
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
                    happiness: 0.8,
                    sadness: 0.1,
                    terror: 0.1,
                    curiosity: 0.1,
                    worry: 0,
                },
                0.5,
                0,
                0,
                DEFAULT_CAVE_DISPLAY_CONFIG,
            ).render.eyeShape,
        ).toBe("happy");
    });
});

