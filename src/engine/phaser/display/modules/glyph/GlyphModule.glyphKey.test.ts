import { describe, expect, it, vi } from "vitest";
import { createGlyphModule } from "./GlyphModule";
import { makeDisplayScratch } from "../displayScratchTestUtils";
import {
    makeFakeContainer,
    makeFakePool,
    makeFakeTextureManager,
    makeTestGlyph,
} from "./GlyphModule.testUtils";

describe("GlyphModule glyph key", () => {
    it("uses glyph_key for preset lookup while keeping the display-key pool", () => {
        const root = makeFakeContainer();
        const pool = makeFakePool();
        const get = vi.fn(() => makeTestGlyph());
        const runtime = createGlyphModule({ get } as never).create({
            scene: {},
            layers: {},
            textureManager: makeFakeTextureManager(),
            pulseEngine: { getDemandPulse: () => 0.5 },
            entity: {},
            selectedEntityId: null,
            selectEntity: () => {},
            spec: {
                entityId: "e1",
                display_key: "display_pool",
                glyph_key: "preset_key",
                label: "",
                styleId: null,
                hasPhysics: true,
                x: 0,
                y: 0,
                radius: 10,
            },
            pools: { get: () => pool },
            scratch: makeDisplayScratch({ root }),
        } as never);

        runtime.tick({
            spec: {
                entityId: "e1",
                display_key: "display_pool",
                glyph_key: "preset_key",
                label: "",
                styleId: null,
                hasPhysics: true,
                x: 0,
                y: 0,
                radius: 10,
            },
            pulseEngine: { getDemandPulse: () => 0.5 },
            timeMs: 0,
        } as never);
        expect(get).toHaveBeenCalledWith("preset_key");
    });
});
