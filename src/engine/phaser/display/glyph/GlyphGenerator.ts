import type { GlyphPlacement, GlyphPulseConfig } from "./GlyphTypes";
import { PALETTE } from "./GlyphTypes";
import { GlyphPRNG } from "./GlyphPRNG";
import { computeDelaySignature } from "./glyphDelaySignature";
import {
    CORE_SHAPES,
    SAT_SHAPES,
    SAT_SCALE_CHOICES,
    TEMPLATES,
    ROTATION_SETS,
    DIST_FACTOR_PAIRS,
    SCALE_PULSE_PAIRS,
    ROT_DELTA_PAIRS,
    CORE_SCALE,
} from "./glyphGenConstants";

export interface GlyphConfigWithoutId {
    placements: GlyphPlacement[];
    pulse: GlyphPulseConfig;
}

const buildCore = (rng: GlyphPRNG, primary: string): GlyphPlacement => {
    const shape = rng.pick(CORE_SHAPES);
    const rotation = rng.pick(ROTATION_SETS[shape]);
    return {
        shape,
        position: 4,
        rotationDeg: rotation,
        scale: CORE_SCALE,
        colorHex: primary,
        radialPositionFactor: 1,
    };
};

const selectSatellitePositions = (rng: GlyphPRNG): number[] => {
    const template = rng.pick(TEMPLATES);
    const satCount = Math.min(
        4,
        Math.floor(rng.unit() * (template.length + 1)),
    );
    const shift = Math.floor(rng.unit() * template.length);
    const rotated = [...template.slice(shift), ...template.slice(0, shift)];
    return rotated.slice(0, satCount);
};

const buildSatellites = (
    rng: GlyphPRNG,
    positions: number[],
    primary: string,
    secondary: string,
): GlyphPlacement[] =>
    positions.map((pos, idx) => {
        const shape = rng.pick(SAT_SHAPES);
        const rotation = rng.pick(ROTATION_SETS[shape]);
        const scale = rng.pick(SAT_SCALE_CHOICES);
        const color = idx % 2 === 0 ? secondary : primary;
        return {
            shape,
            position: pos,
            rotationDeg: rotation,
            scale,
            colorHex: color,
            radialPositionFactor: 1,
        };
    });

const buildPulse = (rng: GlyphPRNG, ordinal: number): GlyphPulseConfig => {
    const [dMin, dMax] = rng.pick(DIST_FACTOR_PAIRS);
    const [sMin, sMax] = rng.pick(SCALE_PULSE_PAIRS);
    const [rMin, rMax] = rng.pick(ROT_DELTA_PAIRS);
    return {
        distanceFromCenterMinFactor: dMin,
        distanceFromCenterMaxFactor: dMax,
        scalePulseMin: sMin,
        scalePulseMax: sMax,
        rotationDeltaMinDeg: rMin,
        rotationDeltaMaxDeg: rMax,
        delayMsByPosition: computeDelaySignature(ordinal),
    };
};

export const generateGlyph = (
    seed: string,
    ordinal: number,
): GlyphConfigWithoutId => {
    const rng = new GlyphPRNG(seed, ordinal);
    const primaryIdx = Math.floor(rng.unit() * PALETTE.length);
    const primary = PALETTE[primaryIdx];
    const secondary = PALETTE[(primaryIdx + 1) % PALETTE.length];
    const corePlacement = buildCore(rng, primary);
    const satPositions = selectSatellitePositions(rng);
    const satellites = buildSatellites(rng, satPositions, primary, secondary);
    const pulse = buildPulse(rng, ordinal);
    return { placements: [corePlacement, ...satellites], pulse };
};
