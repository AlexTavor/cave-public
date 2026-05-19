import { describe, expect, it } from "vitest";
import { DEFAULT_BACKGROUND_CONFIG } from "../../data/schemas/assets";
import { toAssetModule, toSemanticFragment } from "./semanticModuleFragments";

describe("semanticModuleFragments .art background", () => {
    it("fills defaults when reading settings.background", () => {
        const moduleData = toAssetModule("modules/assets.art", {
            settings: { background: { enabled: true } },
        });

        expect(moduleData.assets.settings.background).toEqual({
            ...DEFAULT_BACKGROUND_CONFIG,
            enabled: true,
        });
    });

    it("preserves settings.background when serializing", () => {
        const moduleData = toAssetModule("modules/assets.art", {
            settings: { background: { enabled: true, intensity: 0.5 } },
        });

        expect(
            toSemanticFragment("modules/assets.art", moduleData),
        ).toMatchObject({
            settings: {
                background: {
                    ...DEFAULT_BACKGROUND_CONFIG,
                    enabled: true,
                    intensity: 0.5,
                },
            },
        });
    });

    it("preserves glyphs when reading and serializing assets.art", () => {
        const input = {
            glyphs: {
                egg: {
                    placements: [
                        {
                            shape: "ring",
                            position: 4,
                            rotationDeg: 0,
                            scale: 1,
                            colorHex: "#12abef",
                        },
                    ],
                    pulse: {
                        distanceFromCenterMinFactor: 0.4,
                        distanceFromCenterMaxFactor: 0.8,
                        scalePulseMin: 0.9,
                        scalePulseMax: 1.1,
                        rotationDeltaMinDeg: -5,
                        rotationDeltaMaxDeg: 5,
                        delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0],
                    },
                },
            },
        };
        const moduleData = toAssetModule("modules/assets.art", input);

        expect(moduleData.assets.glyphs).toMatchObject({
            egg: {
                placements: [{ position: 4, colorHex: "#12abef" }],
            },
        });
        expect(
            toSemanticFragment("modules/assets.art", moduleData),
        ).toMatchObject({
            glyphs: {
                egg: {
                    placements: [{ position: 4, colorHex: "#12abef" }],
                },
            },
        });
    });

    it("preserves glyph_view defaultLineThickness when reading and serializing assets.art", () => {
        const moduleData = toAssetModule("modules/assets.art", {
            settings: { glyph_view: { defaultLineThickness: 24 } },
        });

        expect(moduleData.assets.settings.glyph_view).toEqual({
            defaultLineThickness: 24,
        });
        expect(
            toSemanticFragment("modules/assets.art", moduleData),
        ).toMatchObject({
            settings: {
                glyph_view: {
                    defaultLineThickness: 24,
                },
            },
        });
    });
});
