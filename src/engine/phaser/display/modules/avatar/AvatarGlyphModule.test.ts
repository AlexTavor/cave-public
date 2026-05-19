import { describe, expect, it, vi } from "vitest";
import { createAvatarGlyphModule } from "./AvatarGlyphModule";
import {
    makeFakeContainer,
    makeFakePool,
    makeFakeRegistry,
    makeTestGlyph,
    makeFakeImage,
    makeFakeTextureManager,
} from "../glyph/GlyphModule.testUtils";
import { makeDisplayScratch } from "../displayScratchTestUtils";

const makeCtx = (glyphKey?: string) => {
    const pool = makeFakePool();
    const calls: string[] = [];
    const getPool = (key: string) => {
        calls.push(key);
        return pool;
    };
    return {
        calls,
        ctx: {
            scene: {} as unknown,
            layers: {} as unknown,
            textureManager: makeFakeTextureManager() as unknown,
            pulseEngine: { getDemandPulse: () => 0.5 } as unknown,
            entity: {} as unknown,
            selectedEntityId: null,
            selectEntity: () => {},
            timeMs: 0,
            deltaMs: 16,
            pulseValue: 0.5,
            spec: {
                entityId: "e1",
                display_key: "body_avatar",
                glyph_key: glyphKey ?? null,
                label: "",
                styleId: null,
                hasPhysics: true,
                x: 0,
                y: 0,
                radius: 12,
            },
            pools: { get: getPool } as unknown,
            scratch: makeDisplayScratch({
                root: makeFakeContainer(),
                mainImage: makeFakeImage() as never,
            }),
        },
        pool,
    };
};

describe("AvatarGlyphModule", () => {
    it("renders avatar glyphs through the glyph display key without replacing mainImage", () => {
        const { ctx, calls, pool } = makeCtx("glyph.worker");
        const runtime = createAvatarGlyphModule(
            makeFakeRegistry(makeTestGlyph()),
        ).create(ctx as never);
        const preservedMain = ctx.scratch.mainImage;
        runtime.tick(ctx as never);
        runtime.destroy(ctx as never);
        expect(calls).toContain("glyph.worker");
        expect(pool.released).toHaveLength(9);
        expect(ctx.scratch.mainImage).toBe(preservedMain);
    });

    it("is a no-op when no passport glyph is resolved", () => {
        const { ctx, calls, pool } = makeCtx();
        const spy = vi.spyOn(pool.imagePool, "acquire");
        createAvatarGlyphModule(makeFakeRegistry(makeTestGlyph()))
            .create(ctx as never)
            .tick(ctx as never);
        expect(calls).toEqual([]);
        expect(spy).not.toHaveBeenCalled();
    });
});
