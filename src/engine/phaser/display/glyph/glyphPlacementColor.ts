import type { GlyphPaletteColorKey, GlyphPlacement } from "../../../../data/schemas/assets/GlyphTypes";

export type GlyphPaletteColors = Partial<Record<GlyphPaletteColorKey, string>>;

export const resolveGlyphPlacementColor = (
    placement: GlyphPlacement,
    paletteColors?: GlyphPaletteColors,
) => {
    const paletteColor = placement.paletteColorKey
        ? paletteColors?.[placement.paletteColorKey]
        : null;
    return paletteColor || placement.colorHex;
};
