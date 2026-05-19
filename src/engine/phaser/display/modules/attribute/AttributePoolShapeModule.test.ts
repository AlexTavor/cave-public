import { describe, expect, it, vi } from "vitest";

vi.mock("../../../utils/TextureManager", () => ({
    STANDARD_TEXTURE_RADIUS: 64,
}));

import { makeDisplayScratch } from "../displayScratchTestUtils";
import {
    makeFakeContainer,
    makeFakePool,
    type FakeImage,
} from "../glyph/GlyphModule.testUtils";
import { AttributePoolShapeModule } from "./AttributePoolShapeModule";

const makeCtx = (display_key = "attr_body", radius = 32, hasPhysics = true) => {
    const pool = makeFakePool();
    const backgroundAnchor = makeFakeContainer();
    const scratch = makeDisplayScratch({ backgroundAnchor, mainImage: null });
    const textureManager = {
        getShapeTexture: vi.fn(({ shape }) => `${shape}-key`),
    };
    const ctx = {
        scene: {},
        layers: {},
        pools: { get: () => pool },
        textureManager,
        pulseEngine: {
            getAllNodeColors: () => ({
                body: "#f00",
                mind: "#0f0",
                social: "#00f",
            }),
        },
        spec: {
            entityId: "pool-1",
            display_key,
            label: "",
            styleId: null,
            hasPhysics,
            x: 0,
            y: 0,
            radius,
        },
        scratch,
        entity: {},
        selectedEntityId: null,
        selectEntity: vi.fn(),
    } as any;
    return { ctx, pool, scratch, backgroundAnchor, textureManager };
};

const readImage = (setup: ReturnType<typeof makeCtx>) => {
    const image = setup.scratch.mainImage;
    if (!image) throw new Error("Expected mainImage");
    return image as FakeImage;
};

describe("AttributePoolShapeModule", () => {
    it("renders only the white body pool shape", () => {
        const setup = makeCtx();
        const runtime = AttributePoolShapeModule.create(setup.ctx);
        runtime.tick(setup.ctx);
        expect(setup.textureManager.getShapeTexture).toHaveBeenCalledWith({
            shape: "plus_rounded",
            color: "#ffffff",
        });
        expect(setup.backgroundAnchor.children).toHaveLength(1);
        expect(readImage(setup).textureKey).toBe("plus_rounded-key");
        expect(readImage(setup).scale).toBe(0.5);
        expect(readImage(setup).visible).toBe(true);
        expect(setup.scratch.backgroundImage).toBeNull();
    });

    it("hides the image when physics is disabled", () => {
        const setup = makeCtx("attr_body", 32, false);
        AttributePoolShapeModule.create(setup.ctx).tick(setup.ctx);
        expect(readImage(setup).visible).toBe(false);
    });

    it("hides the image when the radius is not visible", () => {
        const setup = makeCtx("attr_body", 0.5);
        AttributePoolShapeModule.create(setup.ctx).tick(setup.ctx);
        expect(readImage(setup).visible).toBe(false);
    });

    it("logs and hides on invalid display keys", () => {
        const setup = makeCtx("not_a_pool");
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        AttributePoolShapeModule.create(setup.ctx).tick(setup.ctx);
        expect(error).toHaveBeenCalledTimes(1);
        expect(readImage(setup).visible).toBe(false);
        error.mockRestore();
    });

    it("releases its owned image and clears mainImage on destroy", () => {
        const setup = makeCtx();
        const runtime = AttributePoolShapeModule.create(setup.ctx);
        runtime.destroy(setup.ctx);
        expect(setup.backgroundAnchor.children).toHaveLength(0);
        expect(setup.pool.released).toHaveLength(1);
        expect(setup.scratch.mainImage).toBeNull();
    });
});
