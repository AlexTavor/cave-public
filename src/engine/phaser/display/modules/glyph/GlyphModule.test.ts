import { describe, it, expect } from "vitest";
import { createGlyphModule } from "./GlyphModule";
import { BLEND_MODE_ADD, BLEND_MODE_NORMAL } from "../../blendModes";
import type { DisplayTickContext } from "../../types";
import { makeDisplayScratch } from "../displayScratchTestUtils";
import {
    makeFakeContainer,
    makeFakePool,
    makeFakeTextureManager,
    makeTestGlyph,
    makeFakeRegistry,
} from "./GlyphModule.testUtils";

const buildCtx = (
    root: ReturnType<typeof makeFakeContainer>,
    pool: ReturnType<typeof makeFakePool>,
    radius: number,
) => ({
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
        display_key: "attr_body",
        label: "",
        styleId: null,
        hasPhysics: true,
        x: 0,
        y: 0,
        radius,
    },
    pools: { get: () => pool } as unknown,
    scratch: makeDisplayScratch({ root }),
});

const setup = (radius = 10, numPlacements = 1) => {
    const root = makeFakeContainer();
    const pool = makeFakePool();
    const registry = makeFakeRegistry(makeTestGlyph(numPlacements));
    const module = createGlyphModule(registry);
    const ctx = buildCtx(root, pool, radius) as unknown as DisplayTickContext;
    return { root, pool, module, ctx };
};

describe("GlyphModule", () => {
    it("create attaches 9 images and sets mainImage to the first image", () => {
        const { root, module, ctx } = setup();
        module.create(ctx);
        expect(root.children.length).toBe(9);
        expect(ctx.scratch.mainImage).toBe(root.children[0]);
    });

    it("tick renders one normal-blend image per active slot", () => {
        const { root, module, ctx } = setup(10, 1);
        const runtime = module.create(ctx);
        runtime.tick(ctx);
        expect(root.children[0].blendMode).toBe(BLEND_MODE_NORMAL);
        expect(
            root.children.some((img) => img.blendMode === BLEND_MODE_ADD),
        ).toBe(false);
    });

    it("tick hides unused placement slots", () => {
        const { root, module, ctx } = setup(10, 2);
        const runtime = module.create(ctx);
        runtime.tick(ctx);
        for (let i = 2; i < 9; i++)
            expect(root.children[i].visible).toBe(false);
    });

    it("tick hides all images when radius is not visible", () => {
        const { root, module, ctx } = setup(0.5, 1);
        const runtime = module.create(ctx);
        runtime.tick(ctx);
        for (const img of root.children) expect(img.visible).toBe(false);
    });

    it("destroy releases 9 images and clears mainImage", () => {
        const { pool, module, ctx } = setup();
        const runtime = module.create(ctx);
        runtime.destroy(ctx);
        expect(pool.released.length).toBe(9);
        expect(ctx.scratch.mainImage).toBeNull();
    });
});
