import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    resolveGlyphPlacementRenderModel: vi.fn((_: any) => []),
}));

vi.mock("../resolveGlyphPlacementRenderModel", () => ({
    resolveGlyphPlacementRenderModel: mocks.resolveGlyphPlacementRenderModel,
}));

import { tickGlyphImages } from "./glyphModuleRuntime";

describe("glyphModuleRuntime", () => {
    it("reads no pulse motion when the shared tick pulse is zero", () => {
        let pulseValue = -1;
        let paletteColors: any;
        mocks.resolveGlyphPlacementRenderModel.mockImplementation(((
            params: any,
        ) => {
            pulseValue = params.readPulseValue({ position: 0 }, 0);
            paletteColors = params.paletteColors;
            return [];
        }) as any);

        tickGlyphImages(
            {
                spec: { radius: 20, entityId: "e1", display_key: "glyph" },
                pulseValue: 0,
                timeMs: 100,
                pulseEngine: {
                    getDemandPulse: () => 0.75,
                    getAllNodeColors: () => ({ gold: "#ffcc00" }),
                },
                textureManager: {},
            } as any,
            [] as any,
            {
                get: () => ({
                    pulse: { delayMsByPosition: [0] },
                    placements: [],
                }),
                getDefaultLineThickness: () => 10,
            } as any,
        );

        expect(pulseValue).toBe(0);
        expect(paletteColors.gold).toBe("#ffcc00");
    });

    it("uses the authored display asset key for default line thickness", () => {
        let defaultLineThickness = -1;
        mocks.resolveGlyphPlacementRenderModel.mockImplementation(((
            params: any,
        ) => {
            defaultLineThickness = params.defaultLineThickness;
            return [];
        }) as any);

        tickGlyphImages(
            {
                scene: {
                    readRuntime: () => ({
                        getCartridge: () => ({
                            assets: {
                                displays: {
                                    inside: {
                                        type: "resource",
                                        defaultLineThickness: 30,
                                    },
                                },
                                settings: {
                                    glyph_view: { defaultLineThickness: 10 },
                                },
                            },
                        }),
                    }),
                },
                spec: {
                    radius: 20,
                    entityId: "e1",
                    display_key: "generic_node",
                    display_asset_key: "inside",
                    glyph_key: "inside",
                },
                pulseValue: 0,
                timeMs: 100,
                pulseEngine: {
                    getDemandPulse: () => 0.75,
                    getAllNodeColors: () => ({ gold: "#ffcc00" }),
                },
                textureManager: {},
            } as any,
            [] as any,
            {
                get: () => ({
                    pulse: { delayMsByPosition: [0] },
                    placements: [],
                }),
                getDefaultLineThickness: () => 10,
            } as any,
        );

        expect(defaultLineThickness).toBe(30);
    });
});
