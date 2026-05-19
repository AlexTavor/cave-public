import { describe, expect, it, vi } from "vitest";

const createGameRuntimeMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../engine/runtime/createGameRuntime", () => ({
    createGameRuntime: createGameRuntimeMock,
}));

import { createDisplayAssetPreviewRuntime } from "./createDisplayAssetPreviewRuntime";

describe("createDisplayAssetPreviewRuntime", () => {
    it("clones authored displays under a synthetic preview key", () => {
        const runtime = {
            commands: { enqueue: vi.fn() },
            tick: vi.fn(),
        };
        createGameRuntimeMock.mockReturnValue(runtime);
        createDisplayAssetPreviewRuntime(
            {
                metadata: { id: "assets.art", name: "assets", version: "1" },
                assets: {
                    displays: {
                        cave_level: {
                            type: "resource",
                            styleId: "cave_xp",
                            glyphKey: "cave_level",
                        },
                    },
                    styles: {},
                    glyphs: {},
                    settings: {
                        game_config: { world: { width: 100, height: 80 } },
                    },
                },
                blueprints: {},
                config: { traits: {}, settings: {} },
            } as never,
            "cave_level",
        );
        const cloned = createGameRuntimeMock.mock.calls[0][0];
        expect(cloned.assets.displays.__display_preview_asset__).toEqual(
            cloned.assets.displays.cave_level,
        );
        expect(
            cloned.blueprints.__display_preview__.components.display
                .display_key,
        ).toBe("__display_preview_asset__");
        expect(
            cloned.blueprints.__display_preview__.components.powerSink,
        ).toEqual({
            baseDemand: { body: 0, mind: 0, social: 0 },
            maxDemand: { body: 0, mind: 0, social: 0 },
            status: "nominal",
            drawFraction: { body: 1 },
            allocatedDraw: { body: 1 },
        });
    });

    it("seeds preview cycle progress for authored cycle-progress displays", () => {
        createGameRuntimeMock.mockReturnValue({
            commands: { enqueue: vi.fn() },
            tick: vi.fn(),
        });
        createDisplayAssetPreviewRuntime(
            {
                metadata: { id: "assets.art", name: "assets", version: "1" },
                assets: {
                    displays: {
                        cave_level: {
                            type: "resource",
                            styleId: "cave_xp",
                            glyphKey: "cave_level",
                        },
                    },
                    styles: {
                        cave_xp: {
                            cycleProgress: { family: "circle", color: "#fff" },
                        },
                    },
                    glyphs: {},
                    settings: {},
                },
                blueprints: {},
                config: { traits: {}, settings: {} },
            } as never,
            "cave_level",
            25,
        );

        expect(
            createGameRuntimeMock.mock.calls.at(-1)?.[0].blueprints
                .__display_preview__.components.state,
        ).toEqual({ cycle: { value: 25, max: 100 } });
    });
});
