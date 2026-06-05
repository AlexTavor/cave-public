import type { GlyphPlacement, GlyphPulseConfig } from "../../../../data/schemas/assets/GlyphTypes";
import type { GlyphConfigWithoutId } from "./GlyphGenerator";
import { resolvePlacementAnimation } from "./glyphAnimation";

interface CanonicalPlacement extends GlyphPlacement {
    radialPositionFactor: number;
    animation: ReturnType<typeof resolvePlacementAnimation>;
}

const comparePlacements = (a: CanonicalPlacement, b: CanonicalPlacement) => {
    if (a.position !== b.position) return a.position - b.position;
    if (a.shape !== b.shape) return a.shape < b.shape ? -1 : 1;
    if (a.rotationDeg !== b.rotationDeg) return a.rotationDeg - b.rotationDeg;
    if (a.scale !== b.scale) return a.scale - b.scale;
    if (a.colorHex !== b.colorHex) return a.colorHex < b.colorHex ? -1 : 1;
    return a.radialPositionFactor - b.radialPositionFactor;
};

const canonicalizePlacement = (
    placement: GlyphPlacement,
    pulse: GlyphPulseConfig,
): CanonicalPlacement => ({
    ...placement,
    radialPositionFactor: placement.radialPositionFactor ?? 1,
    animation: resolvePlacementAnimation(placement, pulse),
});

const placementKey = (placement: CanonicalPlacement): string => {
    const animation = placement.animation;
    return [
        placement.position,
        placement.shape,
        placement.rotationDeg,
        placement.scale,
        placement.colorHex,
        placement.radialPositionFactor,
        animation.distanceFromCenterMinFactor,
        animation.distanceFromCenterMaxFactor,
        animation.scalePulseMin,
        animation.scalePulseMax,
        animation.rotationDeltaMinDeg,
        animation.rotationDeltaMaxDeg,
        animation.reverseDirection ? 1 : 0,
    ].join(":");
};

export interface CanonicalGlyph {
    placements: CanonicalPlacement[];
    pulse: GlyphPulseConfig;
}

export const canonicalize = (config: GlyphConfigWithoutId): CanonicalGlyph => ({
    placements: config.placements
        .map((placement) => canonicalizePlacement(placement, config.pulse))
        .sort(comparePlacements),
    pulse: { ...config.pulse },
});

export const canonicalKey = (config: GlyphConfigWithoutId): string => {
    const canonical = canonicalize(config);
    const placementsStr = canonical.placements.map(placementKey).join("|");
    const pulse = canonical.pulse;
    return [
        placementsStr,
        pulse.distanceFromCenterMinFactor,
        pulse.distanceFromCenterMaxFactor,
        pulse.scalePulseMin,
        pulse.scalePulseMax,
        pulse.rotationDeltaMinDeg,
        pulse.rotationDeltaMaxDeg,
        pulse.delayMsByPosition.join(","),
    ].join(";");
};
