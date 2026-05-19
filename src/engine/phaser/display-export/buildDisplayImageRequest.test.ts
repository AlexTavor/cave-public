import { describe, expect, it } from "vitest";
import { createBlueprint, createCartridge } from "../../test/factories";
import { buildDisplayImageRequest } from "./buildDisplayImageRequest";

describe("buildDisplayImageRequest", () => {
    it("falls through raw blueprint drafts to later authored display sources", () => {
        const blueprintDraft = createCartridge("hommlet.bp", {
            blueprints: {
                hommlet: createBlueprint("hommlet", {
                    components: {},
                    _editor: { abilities: { passport: { label: "Hommlet" } } },
                }),
            },
        });
        const assetDraft = createCartridge("assets.art", {
            assets: {
                displays: {
                    hommlet: {
                        type: "resource",
                        styleId: "hommlet",
                        glyphKey: "hommlet",
                    },
                },
                styles: {
                    hommlet: {
                        cycleProgress: {
                            family: "circle",
                            familyRotationDeg: 0,
                            color: "#ffffff",
                        },
                    },
                },
                glyphs: { hommlet: { placements: [] } },
            },
        });

        const request = buildDisplayImageRequest({
            displayKey: "hommlet",
            sources: [blueprintDraft, assetDraft],
        });

        expect(request).toMatchObject({
            kind: "resolved_display",
            displayKey: "hommlet",
            glyphKey: "hommlet",
            style: {
                cycleProgress: expect.objectContaining({ color: "#ffffff" }),
            },
        });
    });

    it("returns null when no source can resolve the display key", () => {
        expect(
            buildDisplayImageRequest({
                displayKey: "missing",
                sources: [createCartridge("empty.art", {})],
            }),
        ).toBeNull();
    });

    it("prefers per-display default line thickness over the legacy global setting", () => {
        const assetDraft = createCartridge("assets.art", {
            assets: {
                displays: {
                    hommlet: {
                        type: "resource",
                        styleId: "hommlet",
                        glyphKey: "hommlet",
                        defaultLineThickness: 24,
                    },
                },
                settings: {
                    glyph_view: { defaultLineThickness: 9 },
                },
                styles: {
                    hommlet: {
                        cycleProgress: {
                            family: "circle",
                            familyRotationDeg: 0,
                            color: "#ffffff",
                        },
                    },
                },
                glyphs: { hommlet: { placements: [] } },
            },
        });

        const request = buildDisplayImageRequest({
            displayKey: "hommlet",
            sources: [assetDraft],
        });

        expect(request).toMatchObject({
            kind: "resolved_display",
            defaultLineThickness: 24,
        });
    });
});
