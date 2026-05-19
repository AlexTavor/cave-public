import type { GlyphPreset } from "../../../../../data/schemas/assets/glyphs";
import { resolvePlacementAnimation } from "../../../../../engine/phaser/display/glyph/glyphAnimation";

export const makePlacement = (
    position: number,
): GlyphPreset["placements"][number] => ({
    shape: "ring",
    position,
    rotationDeg: 0,
    scale: 1,
    colorHex: "#000000",
    radialPositionFactor: 1,
});

export const readPlacementDraft = (glyph: GlyphPreset, position: number) =>
    glyph.placements.find((placement) => placement.position === position) ??
    null;

export const ensurePlacementAnimationDraft = (
    glyph: GlyphPreset,
    position: number,
) => {
    const placement = readPlacementDraft(glyph, position);
    if (!placement) return null;
    if (!placement.animation) {
        const animation = resolvePlacementAnimation(placement, glyph.pulse);
        const nextAnimation: NonNullable<
            GlyphPreset["placements"][number]["animation"]
        > = {
            ...animation,
            reverseDirection: Boolean(animation.reverseDirection),
        };
        placement.animation = nextAnimation;
    }
    return placement.animation;
};

export const readSelectedPlacementEditorState = (
    glyph: GlyphPreset,
    position: number,
) => {
    const existing = readPlacementDraft(glyph, position);
    const placement = existing ?? makePlacement(position);
    const animation = resolvePlacementAnimation(placement, glyph.pulse);
    return {
        enabled: Boolean(existing),
        shape: placement.shape,
        colorHex: placement.colorHex,
        paletteColorKey: placement.paletteColorKey,
        lineThickness: placement.lineThickness,
        scale: placement.scale,
        rotationDeg: placement.rotationDeg,
        radialPositionFactor: placement.radialPositionFactor ?? 1,
        animation: {
            ...animation,
            reverseDirection: Boolean(animation.reverseDirection),
        },
    };
};
