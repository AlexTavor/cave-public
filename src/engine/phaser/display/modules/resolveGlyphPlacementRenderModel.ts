import type {
    GlyphConfig,
    GlyphPlacement,
    GlyphShape,
} from "../glyph/GlyphTypes";
import type { GlyphPaletteColors } from "../glyph/glyphPlacementColor";
import { resolveGlyphPlacementColor } from "../glyph/glyphPlacementColor";
import { resolveGlyphPlacementTransform } from "../glyph/glyphRenderMath";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export interface GlyphPlacementRenderInstruction {
    slotIndex: number;
    shape: GlyphShape;
    color: string;
    thickness: number;
    xPx: number;
    yPx: number;
    imageScale: number;
    rotationDeg: number;
}

export const resolveGlyphPlacementRenderModel = (params: {
    glyph: GlyphConfig;
    radius: number;
    paletteColors?: GlyphPaletteColors;
    defaultLineThickness: number;
    readPulseValue: (placement: GlyphPlacement, slotIndex: number) => number;
}): GlyphPlacementRenderInstruction[] =>
    params.glyph.placements.reduce<GlyphPlacementRenderInstruction[]>(
        (instructions, placement, slotIndex) => {
            const pulseValue = clamp01(
                params.readPulseValue(placement, slotIndex),
            );
            const transform = resolveGlyphPlacementTransform({
                radius: params.radius,
                placement,
                pulse: params.glyph.pulse,
                pulseValue,
            });
            instructions.push({
                slotIndex,
                shape: placement.shape,
                color: resolveGlyphPlacementColor(
                    placement,
                    params.paletteColors,
                ),
                thickness:
                    placement.lineThickness ?? params.defaultLineThickness,
                xPx: transform.xPx,
                yPx: transform.yPx,
                imageScale: transform.imageScale,
                rotationDeg: transform.rotationDeg,
            });
            return instructions;
        },
        [],
    );
