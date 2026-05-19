export interface GlyphGlowPass {
    outsetPx: number;
    alpha: number;
}

export const GLYPH_GLOW_VERSION = "v3";
export const GLYPH_GLOW_MAX_OUTSET_PX = 8;
export const GLYPH_GLOW_PASSES: readonly GlyphGlowPass[] = [
    { outsetPx: 8, alpha: 0.012 },
    { outsetPx: 7, alpha: 0.018 },
    { outsetPx: 6, alpha: 0.026 },
    { outsetPx: 5, alpha: 0.036 },
    { outsetPx: 4, alpha: 0.048 },
    { outsetPx: 3, alpha: 0.062 },
    { outsetPx: 2, alpha: 0.078 },
    { outsetPx: 1, alpha: 0.096 },
];

