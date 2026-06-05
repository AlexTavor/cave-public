import type { DisplayPaletteKey } from "../../../../../lib/displays/displayKeyKinds";
import type { GlyphShape } from "../../../../../data/schemas/assets/GlyphTypes";
import { clamp, withPlacement } from "./blueprintVisualsActionUtils";

export const createGlyphFieldActions = (
    mutateGlyph: (recipe: (glyph: any) => void) => void,
) => ({
    updatePlacementShape: (position: number, value: string) =>
        mutateGlyph((glyph) => {
            withPlacement(glyph, position).shape = value as GlyphShape;
        }),
    updatePlacementColor: (position: number, value: string) =>
        mutateGlyph((glyph) => {
            withPlacement(glyph, position).colorHex = value;
        }),
    updatePlacementPaletteColor: (
        position: number,
        value: DisplayPaletteKey | "",
    ) =>
        mutateGlyph((glyph) => {
            withPlacement(glyph, position).paletteColorKey = value || undefined;
        }),
    updatePlacementLineThickness: (position: number, value: number | null) =>
        mutateGlyph((glyph) => {
            withPlacement(glyph, position).lineThickness =
                value && value > 0 ? value : undefined;
        }),
    updatePlacementScale: (position: number, value: number) =>
        mutateGlyph((glyph) => {
            withPlacement(glyph, position).scale = clamp(value, 0.1, 4);
        }),
    updatePlacementRotation: (position: number, value: number) =>
        mutateGlyph((glyph) => {
            withPlacement(glyph, position).rotationDeg = value;
        }),
    updatePlacementRadialPosition: (position: number, value: number) =>
        mutateGlyph((glyph) => {
            withPlacement(glyph, position).radialPositionFactor = clamp(
                value,
                0,
                1,
            );
        }),
});
