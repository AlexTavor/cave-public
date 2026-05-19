/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    drawTintedTexture: vi.fn(),
    readPhaserTextureSource: vi.fn(() => ({ width: 32, height: 32 })),
}));

vi.mock("./drawTintedTexture", () => mocks);
vi.mock("./readPhaserTextureSource", () => mocks);

import { renderBodyAvatarImage } from "./renderBodyAvatarImage";

const makeCanvas = () => {
    const ctx = { clearRect: vi.fn() } as unknown as CanvasRenderingContext2D;
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "getContext", { value: vi.fn(() => ctx) });
    Object.defineProperty(canvas, "toDataURL", {
        value: vi.fn(() => "data:url"),
    });
    return { canvas, ctx };
};

describe("renderBodyAvatarImage", () => {
    it("renders avatar layers without compositing passport glyphs", () => {
        const { canvas, ctx } = makeCanvas();
        const scene = {
            glyphRegistry: {
                get: vi.fn(() => ({ placements: [{}], pulse: null })),
            },
            textureManager: {
                getAvatarGlowTexture: vi.fn(() => "glow"),
                getAvatarSilhouetteTexture: vi.fn(() => "body"),
                getAvatarEyesTexture: vi.fn(() => "eyes"),
            },
        } as any;
        renderBodyAvatarImage(
            scene,
            {
                kind: "body_avatar",
                subjectSeed: "body-1",
                glyphKey: "worker",
                appearance: { appearanceKey: "ap" } as never,
                glyphs: {},
                renderSeed: "seed-1",
            },
            canvas,
        );
        expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 128, 128);
        expect(mocks.drawTintedTexture).toHaveBeenCalledTimes(3);
        expect(scene.glyphRegistry.get).not.toHaveBeenCalled();
    });
});
