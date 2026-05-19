import type { ModuleCartridge } from "../../../../data/schemas/module";
import { createDefaultDisplayStyle } from "../../../../data/schemas/assets/defaultDisplayStyle";
import { readDisplayPaletteOptions } from "../../../../lib/displays/displayKeyKinds";
import { readDisplayDefaultLineThickness } from "../../../../lib/displays/displayDefaultLineThickness";
import { GlyphPresetSchema } from "../../../../data/schemas/assets";
import { generateGlyph } from "../../../../engine/phaser/display/glyph/GlyphGenerator";

export const readPaletteOptions = (draft: ModuleCartridge) =>
    readDisplayPaletteOptions(draft.assets.settings);

export const readDefaultLineThickness = (
    draft: ModuleCartridge,
    displayId: string,
) => readDisplayDefaultLineThickness(draft, displayId);

export const readResourceViewAsset = (
    draft: ModuleCartridge,
    displayId: string,
) =>
    draft.assets.displays?.[displayId]?.type === "resource"
        ? draft.assets.displays[displayId]
        : null;

export const readResourceViewStyleId = (
    draft: ModuleCartridge,
    displayId: string,
) => readResourceViewAsset(draft, displayId)?.styleId || displayId;

export const readResourceViewGlyphId = (
    draft: ModuleCartridge,
    displayId: string,
) => readResourceViewAsset(draft, displayId)?.glyphKey || displayId;

export const ensureStyleAssetById = (
    draft: ModuleCartridge,
    styleId: string,
) => {
    draft.assets.styles ??= {};
    draft.assets.styles[styleId] ??= createDefaultDisplayStyle();
    return draft.assets.styles[styleId];
};

export const ensureGlyphAssetById = (
    draft: ModuleCartridge,
    glyphId: string,
) => {
    draft.assets.glyphs ??= {};
    draft.assets.glyphs[glyphId] ??= GlyphPresetSchema.parse(
        generateGlyph(glyphId, 0),
    );
    return draft.assets.glyphs[glyphId];
};

export const ensureResourceViewAssets = (
    draft: ModuleCartridge,
    displayId: string,
) => {
    draft.assets.displays ??= {};
    const existing = draft.assets.displays[displayId];
    if (existing?.type !== "resource") {
        draft.assets.displays[displayId] = {
            type: "resource",
            styleId: displayId,
            glyphKey: displayId,
        };
    }
    const display = draft.assets.displays[displayId];
    if (display?.type !== "resource") {
        throw new Error(`Expected resource display: ${displayId}`);
    }
    const resourceDisplay = display;
    resourceDisplay.styleId ||= displayId;
    resourceDisplay.glyphKey ||= displayId;
    ensureStyleAssetById(draft, resourceDisplay.styleId);
    ensureGlyphAssetById(draft, resourceDisplay.glyphKey);
    return resourceDisplay;
};

export const ensureAttributePoolGlyphAsset = (
    draft: ModuleCartridge,
    displayId: string,
    attribute?: "body" | "mind" | "social",
) => {
    draft.assets.displays ??= {};
    const existing = draft.assets.displays[displayId];
    if (existing?.type !== "attribute_pool") {
        draft.assets.displays[displayId] = {
            type: "attribute_pool",
            attribute: attribute ?? "body",
        };
    }
    const display = draft.assets.displays[displayId];
    if (display?.type !== "attribute_pool") {
        throw new Error(`Expected attribute pool display: ${displayId}`);
    }
    const attributeDisplay = display;
    attributeDisplay.glyphKey ||= displayId;
    ensureStyleAssetById(draft, displayId);
    ensureGlyphAssetById(draft, attributeDisplay.glyphKey);
    return attributeDisplay;
};
