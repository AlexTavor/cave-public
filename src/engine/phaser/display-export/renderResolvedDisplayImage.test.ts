/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    resolveCycleProgressVisual: vi.fn(),
    resolveGlyphPlacementRenderModel: vi.fn(),
    renderCycleProgressCanvas: vi.fn(),
    readPhaserTextureSource: vi.fn(() => ({ width: 32, height: 32 })),
    renderDisplayStyleLightCanvas: vi.fn(),
}));

vi.mock("../display/modules/cycle-progress/cycleProgressVisual", () => mocks);
vi.mock("../display/modules/resolveGlyphPlacementRenderModel", () => mocks);
vi.mock("./renderCycleProgressCanvas", () => mocks);
vi.mock("./readPhaserTextureSource", () => mocks);
vi.mock("./renderDisplayStyleLightCanvas", () => mocks);

import { renderResolvedDisplayImage } from "./renderResolvedDisplayImage";

const CYCLE_PROGRESS_STYLE = {
    cycleProgress: { family: "circle", familyRotationDeg: 0, color: "#fff" },
};
const ROPE_REQUEST = {
    points: [
        { x: 0, y: -4 },
        { x: 2, y: 0 },
    ],
};

const makeCanvas = () => {
    const ctx = {
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "getContext", { value: vi.fn(() => ctx) });
    Object.defineProperty(canvas, "toDataURL", {
        value: vi.fn(() => "data:url"),
    });
    return { canvas, ctx };
};

const makeScene = (glyph: object | undefined) =>
    ({
        glyphRegistry: { get: vi.fn(() => glyph) },
        textureManager: { getGlyphTexture: vi.fn(() => "glyph-texture") },
        placeholderVariants: {
            get: vi.fn(() => ({
                texture: "placeholder",
                rotation: 0,
                flipX: false,
            })),
        },
    }) as any;

const renderImage = (
    canvas: HTMLCanvasElement,
    scene: any,
    style: any = null,
) =>
    renderResolvedDisplayImage({
        scene,
        canvas,
        displayKey: "torch",
        glyphKey: "glyph",
        style,
    });

describe("renderResolvedDisplayImage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("uses the shared cycle-progress and glyph resolvers for styled glyph exports", () => {
        const { canvas, ctx } = makeCanvas();
        mocks.resolveCycleProgressVisual.mockReturnValue({
            ropeRequest: ROPE_REQUEST,
        });
        mocks.resolveGlyphPlacementRenderModel.mockReturnValue([
            {
                shape: "ring",
                color: "#fff",
                thickness: 10,
                imageScale: 1,
                xPx: 0,
                yPx: 0,
                rotationDeg: 0,
            },
        ]);
        renderImage(canvas, makeScene({}), CYCLE_PROGRESS_STYLE as never);
        expect(mocks.resolveCycleProgressVisual).toHaveBeenCalledOnce();
        expect(mocks.renderCycleProgressCanvas).toHaveBeenCalledWith(
            ctx,
            ROPE_REQUEST,
        );
        expect(mocks.resolveGlyphPlacementRenderModel).toHaveBeenCalledOnce();
        expect(ctx.drawImage).toHaveBeenCalledOnce();
    });

    it("renders cycle progress only when styled output has no glyph", () => {
        const { canvas, ctx } = makeCanvas();
        mocks.resolveCycleProgressVisual.mockReturnValue({
            ropeRequest: ROPE_REQUEST,
        });
        mocks.resolveGlyphPlacementRenderModel.mockReturnValue([]);
        renderImage(
            canvas,
            makeScene(undefined),
            CYCLE_PROGRESS_STYLE as never,
        );
        expect(mocks.renderCycleProgressCanvas).toHaveBeenCalledOnce();
        expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    it("preserves placeholder fallback for unstyled displays without glyphs", () => {
        const { canvas, ctx } = makeCanvas();
        renderImage(canvas, makeScene(undefined));
        expect(ctx.drawImage).toHaveBeenCalledOnce();
    });

    it("always sizes the canvas to the canonical icon size", () => {
        const { canvas, ctx } = makeCanvas();
        renderImage(canvas, makeScene(undefined));
        expect(canvas.width).toBe(128);
        expect(canvas.height).toBe(128);
        expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 128, 128);
    });
});
