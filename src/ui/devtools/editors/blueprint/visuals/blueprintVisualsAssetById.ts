import type { ModuleCartridge } from "../../../../../data/schemas/module";
import { createDefaultDisplayStyle } from "../../../../../data/schemas/assets/defaultDisplayStyle";
import { GlyphPresetSchema } from "../../../../../data/schemas/assets";
import { generateGlyph } from "../../../../../engine/phaser/display/glyph/GlyphGenerator";

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
