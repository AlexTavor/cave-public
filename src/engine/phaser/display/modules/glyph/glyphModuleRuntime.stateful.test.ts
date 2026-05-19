import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    resolveGlyphPlacementRenderModel: vi.fn(() => []),
}));

vi.mock("./resolveGlyphPlacementRenderModel", () => ({
    resolveGlyphPlacementRenderModel: mocks.resolveGlyphPlacementRenderModel,
}));

import { tickGlyphImages } from "./glyphModuleRuntime";

const makeTrackedImage = () => ({
    setTexture: vi.fn().mockReturnThis(),
    clearTint: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setBlendMode: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setRotation: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
});

describe("glyphModuleRuntime stateful sync", () => {
    it("does not repeat texture or transform setters on an identical second tick", () => {
        mocks.resolveGlyphPlacementRenderModel.mockReturnValue([
            {
                slotIndex: 0,
                shape: "ring",
                color: "#ff0000",
                thickness: 10,
                xPx: 4,
                yPx: 6,
                imageScale: 0.75,
                rotationDeg: 30,
            },
        ] as any);
        const image = makeTrackedImage();
        const ctx = {
            spec: { radius: 20, entityId: "e1", display_key: "glyph" },
            pulseValue: 1,
            timeMs: 100,
            pulseEngine: {
                getDemandPulse: () => 0.75,
                getAllNodeColors: () => ({}),
            },
            textureManager: {
                getGlyphTexture: vi.fn(() => "glyphtex:v3:ring:#ff0000:10"),
            },
        } as any;
        const registry = {
            get: () => ({ pulse: { delayMsByPosition: [0] }, placements: [] }),
            getDefaultLineThickness: () => 10,
        } as any;

        tickGlyphImages(ctx, [image] as any, registry);
        const first = {
            texture: image.setTexture.mock.calls.length,
            position: image.setPosition.mock.calls.length,
            scale: image.setScale.mock.calls.length,
            rotation: image.setRotation.mock.calls.length,
        };
        tickGlyphImages(ctx, [image] as any, registry);

        expect(image.setTexture).toHaveBeenCalledTimes(first.texture);
        expect(image.setPosition).toHaveBeenCalledTimes(first.position);
        expect(image.setScale).toHaveBeenCalledTimes(first.scale);
        expect(image.setRotation).toHaveBeenCalledTimes(first.rotation);
    });
});
