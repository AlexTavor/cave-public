import type { GlyphPlacement, GlyphPulseConfig } from "../../../../data/schemas/assets/GlyphTypes";
import { GLYPH_POSITION_COORDS } from "../../../../data/schemas/assets/GlyphTypes";
import { resolvePlacementAnimation } from "./glyphAnimation";

const TEXTURE_SIZE_PX = 128;
const CELL_FILL_FRACTION = 0.9;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface GlyphTransformParams {
    radius: number;
    placement: GlyphPlacement;
    pulse: GlyphPulseConfig;
    pulseValue: number;
}

export interface GlyphTransformResult {
    xPx: number;
    yPx: number;
    imageScale: number;
    rotationDeg: number;
}

export const resolveGlyphPlacementTransform = (
    params: GlyphTransformParams,
): GlyphTransformResult => {
    const { radius, placement, pulse, pulseValue: p } = params;
    const animation = resolvePlacementAnimation(placement, pulse);
    const pulseValue = animation.reverseDirection ? 1 - p : p;

    const distFactor = lerp(
        animation.distanceFromCenterMinFactor,
        animation.distanceFromCenterMaxFactor,
        pulseValue,
    );
    const baseDistancePx = radius * distFactor;
    const orbitDistancePx =
        baseDistancePx * (placement.radialPositionFactor ?? 1);

    const [gx, gy] = GLYPH_POSITION_COORDS[placement.position];
    const xPx = gx * orbitDistancePx;
    const yPx = gy * orbitDistancePx;

    const pulseScale = lerp(
        animation.scalePulseMin,
        animation.scalePulseMax,
        pulseValue,
    );
    const targetSizePx =
        baseDistancePx * CELL_FILL_FRACTION * placement.scale * pulseScale;
    const imageScale = targetSizePx / TEXTURE_SIZE_PX;

    const rotDelta = lerp(
        animation.rotationDeltaMinDeg,
        animation.rotationDeltaMaxDeg,
        pulseValue,
    );
    const rotationDeg = placement.rotationDeg + rotDelta;

    return { xPx, yPx, imageScale, rotationDeg };
};
