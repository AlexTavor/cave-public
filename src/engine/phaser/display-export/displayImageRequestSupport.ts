import type { DisplayAsset } from "../../../data/schemas/assets/displays";
import type { GlyphPreset } from "../../../data/schemas/assets/glyphs";
import type { EntityStyle } from "../../../data/schemas/assets/styles";
import {
    readDisplayPaletteColors,
    type DisplayPaletteColors,
} from "../../../lib/displays/displayKeyKinds";
import { readDisplayDefaultLineThickness } from "../../../lib/displays/displayDefaultLineThickness";
import type { DisplayImageRequest } from "./DisplayImageExportTypes";

type ModuleLike = {
    assets?: {
        glyphs?: Record<string, GlyphPreset>;
        settings?: Record<string, any>;
    };
};

export const getGlyphs = (moduleData: ModuleLike) =>
    moduleData.assets?.glyphs ?? {};

export const readPaletteColors = (moduleData: ModuleLike) =>
    readDisplayPaletteColors(moduleData.assets?.settings);

export const readDefaultLineThickness = (
    moduleData: ModuleLike,
    displayKey: string,
) => readDisplayDefaultLineThickness(moduleData, displayKey);

export const buildResolvedDisplay = (
    displayKey: string,
    asset: DisplayAsset,
    styles: Record<string, unknown>,
    glyphs: Record<string, GlyphPreset>,
    paletteColors: DisplayPaletteColors,
    defaultLineThickness: number,
): DisplayImageRequest => {
    let glyphKey: string | null = null;
    let style: EntityStyle | null = null;
    if (asset.type === "resource") {
        glyphKey = asset.glyphKey;
        style = (styles[asset.styleId] as EntityStyle | undefined) ?? null;
    }
    if (asset.type === "attribute_pool") {
        glyphKey = asset.glyphKey ?? displayKey;
        style = (styles[displayKey] as EntityStyle | undefined) ?? null;
    }
    return {
        kind: "resolved_display",
        displayKey,
        glyphKey,
        style,
        glyphs,
        paletteColors,
        defaultLineThickness:
            asset.defaultLineThickness ?? defaultLineThickness,
        renderSeed: "display-static",
    };
};
