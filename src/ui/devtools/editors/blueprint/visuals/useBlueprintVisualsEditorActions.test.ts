import { describe, expect, it } from "vitest";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";
import { GlyphPresetSchema } from "../../../../../data/schemas/assets";
import { createBlueprintVisualsEditorActions } from "./useBlueprintVisualsEditorActions";

const createDrafts = () => ({
    "modules/egg.bp": createCartridge("modules/egg.bp", {
        blueprints: {
            egg: createBlueprint("egg", {
                _editor: {
                    abilities: { passport: { label: "Egg", icon: "egg" } },
                },
                components: { display: { display_key: "egg" } } as never,
            }),
        },
    }),
    "modules/assets.art": createCartridge("modules/assets.art"),
});

describe("useBlueprintVisualsEditorActions", () => {
    it("writes visual assets into assets.art and links them from the blueprint", () => {
        const blueprintFilename = "modules/egg.bp";
        const assetFilename = "modules/assets.art";
        const drafts = createDrafts();
        const updateDraft = (id: string, recipe: (draft: any) => void) => {
            recipe(drafts[id as keyof typeof drafts]);
        };
        const actions = createBlueprintVisualsEditorActions({
            blueprintFilename,
            assetFilename,
            blueprintId: "egg",
            getBlueprintDraft: () => drafts[blueprintFilename],
            updateDraft: updateDraft as never,
        });

        actions.updatePlacementColor(4, "#12abef");
        actions.updateCycleProgressColor("#44aa22");
        actions.updateDelay(4, 61);

        expect(
            drafts[blueprintFilename].blueprints.egg._editor?.abilities
                ?.passport,
        ).toMatchObject({ icon: "egg" });
        expect(
            drafts[assetFilename].assets.glyphs?.egg?.placements[0]?.colorHex,
        ).toBe("#12abef");
        expect(
            drafts[assetFilename].assets.glyphs?.egg?.pulse
                .delayMsByPosition[4],
        ).toBe(61);
        expect(
            drafts[assetFilename].assets.styles?.egg?.cycleProgress?.family,
        ).toBe("circle");
        expect(
            drafts[assetFilename].assets.styles?.egg?.cycleProgress?.color,
        ).toBe("#44aa22");
        expect(drafts[assetFilename].assets.displays?.egg).toMatchObject({
            type: "resource",
            styleId: "egg",
            glyphKey: "egg",
        });
        expect(
            drafts[blueprintFilename].blueprints.egg.components.display,
        ).toMatchObject({
            display_key: "egg",
        });
    });

    it("allows enabling all 9 grid slots", () => {
        const blueprintFilename = "modules/egg.bp";
        const assetFilename = "modules/assets.art";
        const drafts = createDrafts();
        drafts[assetFilename].assets.glyphs = {
            egg: GlyphPresetSchema.parse({
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
                    distanceFromCenterMinFactor: 0.4,
                    distanceFromCenterMaxFactor: 0.8,
                    scalePulseMin: 0.9,
                    scalePulseMax: 1.1,
                    rotationDeltaMinDeg: -5,
                    rotationDeltaMaxDeg: 5,
                    delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0],
                },
            }),
        } as never;
        const updateDraft = (id: string, recipe: (draft: any) => void) =>
            recipe(drafts[id as keyof typeof drafts]);
        const actions = createBlueprintVisualsEditorActions({
            blueprintFilename,
            assetFilename,
            blueprintId: "egg",
            getBlueprintDraft: () => drafts[blueprintFilename],
            updateDraft: updateDraft as never,
        });

        actions.togglePlacement(4);
        for (let position = 0; position < 9; position++)
            actions.togglePlacement(position);

        const glyphs = drafts[assetFilename].assets.glyphs as Record<
            string,
            { placements: unknown[] }
        >;
        expect(glyphs.egg.placements).toHaveLength(9);
    });
});
