import type {
    GlyphAnimationEnvelope,
    GlyphPlacement,
    GlyphPulseConfig,
} from "./GlyphTypes";

export const toAnimationEnvelope = (
    pulse: GlyphPulseConfig,
): GlyphAnimationEnvelope => ({
    distanceFromCenterMinFactor: pulse.distanceFromCenterMinFactor,
    distanceFromCenterMaxFactor: pulse.distanceFromCenterMaxFactor,
    scalePulseMin: pulse.scalePulseMin,
    scalePulseMax: pulse.scalePulseMax,
    rotationDeltaMinDeg: pulse.rotationDeltaMinDeg,
    rotationDeltaMaxDeg: pulse.rotationDeltaMaxDeg,
    reverseDirection: false,
});

export const resolvePlacementAnimation = (
    placement: GlyphPlacement,
    pulse: GlyphPulseConfig,
): GlyphAnimationEnvelope => placement.animation ?? toAnimationEnvelope(pulse);
