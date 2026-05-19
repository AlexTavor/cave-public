import { describe, expect, it } from "vitest";
import { parseSemanticFragment } from "./semanticParser";

describe("parseSemanticFragment .art", () => {
    it("accepts glyph preset assets", () => {
        const art = parseSemanticFragment("a.art", ".art", {
            displays: { orb: { type: "body" } },
            glyphs: {
                transfer_wood: {
                    placements: [
                        {
                            shape: "ring",
                            position: 4,
                            rotationDeg: 0,
                            scale: 1,
                            colorHex: "#000000",
                        },
                    ],
                    pulse: {
                        distanceFromCenterMinFactor: 0.55,
                        distanceFromCenterMaxFactor: 0.75,
                        scalePulseMin: 0.95,
                        scalePulseMax: 1.05,
                        rotationDeltaMinDeg: -6,
                        rotationDeltaMaxDeg: 6,
                        delayMsByPosition: [0, 60, 0, 120, 0, 60, 180, 0, 120],
                    },
                },
            },
        });

        expect(art.kind).toBe("art");
    });

    it("normalizes legacy icon and resource keys into displays", () => {
        const art = parseSemanticFragment("a.art", ".art", {
            icons: { attr_body: { type: "emoji", value: "💪" } },
            resources: { wood: { color: "#8B4513" } },
            glyphs: {
                wood: {
                    placements: [
                        {
                            shape: "ring",
                            position: 4,
                            rotationDeg: 0,
                            scale: 1,
                            colorHex: "#000000",
                        },
                    ],
                    pulse: {
                        distanceFromCenterMinFactor: 0.55,
                        distanceFromCenterMaxFactor: 0.75,
                        scalePulseMin: 0.95,
                        scalePulseMax: 1.05,
                        rotationDeltaMinDeg: -6,
                        rotationDeltaMaxDeg: 6,
                        delayMsByPosition: [0, 60, 0, 120, 0, 60, 180, 0, 120],
                    },
                },
            },
            styles: {
                wood: {
                    cycleProgress: {
                        family: "circle",
                        familyRotationDeg: 0,
                        color: "#ffffff",
                    },
                },
            },
        });

        expect(art.kind).toBe("art");
        if (art.kind !== "art") throw new Error("Expected art fragment.");
        expect(art.data.displays?.attr_body).toEqual({
            type: "attribute_pool",
            attribute: "body",
        });
        expect(art.data.displays?.wood).toEqual({
            type: "resource",
            styleId: "wood",
            glyphKey: "wood",
        });
        expect(art.data.displays?.unknown).toBeUndefined();
    });

    it("accepts settings.background", () => {
        const art = parseSemanticFragment("a.art", ".art", {
            settings: { background: { enabled: true, intensity: 0.4 } },
        });

        expect(art.kind).toBe("art");
    });

    it("preserves settings.glyph_view for live runtime asset linking", () => {
        const art = parseSemanticFragment("a.art", ".art", {
            settings: { glyph_view: { defaultLineThickness: 24 } },
        });

        expect(art.kind).toBe("art");
        if (art.kind !== "art") throw new Error("Expected art fragment.");
        expect(art.data.settings?.glyph_view).toEqual({
            defaultLineThickness: 24,
        });
    });
});
