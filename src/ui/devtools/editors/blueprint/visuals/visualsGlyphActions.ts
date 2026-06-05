import { GLYPH_POSITION_COORDS } from "../../../../../data/schemas/assets/GlyphTypes";
import { makePlacement } from "./blueprintVisualsDraft";
import { createGlyphAnimationActions } from "./visualsGlyphAnimationActions";
import { createGlyphFieldActions } from "./visualsGlyphFieldActions";

const MAX_GLYPH_SLOTS = GLYPH_POSITION_COORDS.length;

export const createGlyphVisualActions = (
    mutateGlyph: (recipe: (glyph: any) => void) => void,
    mutateAnimation: (
        position: number,
        recipe: (animation: any) => void,
    ) => void,
) => ({
    togglePlacement: (position: number) =>
        mutateGlyph((glyph) => {
            const next = glyph.placements.filter(
                (item: any) => item.position !== position,
            );
            if (next.length !== glyph.placements.length) {
                glyph.placements = next;
                return;
            }
            if (glyph.placements.length >= MAX_GLYPH_SLOTS) return;
            glyph.placements = [...glyph.placements, makePlacement(position)];
        }),
    ...createGlyphFieldActions(mutateGlyph),
    ...createGlyphAnimationActions(mutateGlyph, mutateAnimation),
});
