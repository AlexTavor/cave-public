import type { DisplayPaletteKey } from "../../../lib/displays/displayKeyKinds";

export type GlyphShape =
    | "line"
    | "chevron"
    | "crescent"
    | "hole"
    | "triangle"
    | "star5"
    | "star6"
    | "circle"
    | "pixel"
    | "ring"
    | "hex_ring"
    | "oct_ring"
    | "square_ring"
    | "plus_rounded"
    | "chevron_up_rounded"
    | "triple_circle";

export type GlyphPaletteColorKey = DisplayPaletteKey;

export const ALL_GLYPH_SHAPES: readonly GlyphShape[] = [
    "line",
    "chevron",
    "crescent",
    "hole",
    "triangle",
    "star5",
    "star6",
    "circle",
    "pixel",
    "ring",
    "hex_ring",
    "oct_ring",
    "square_ring",
    "plus_rounded",
    "chevron_up_rounded",
    "triple_circle",
];

export interface GlyphAnimationEnvelope {
    distanceFromCenterMinFactor: number;
    distanceFromCenterMaxFactor: number;
    scalePulseMin: number;
    scalePulseMax: number;
    rotationDeltaMinDeg: number;
    rotationDeltaMaxDeg: number;
    reverseDirection?: boolean;
}

export interface GlyphPlacement {
    shape: GlyphShape;
    position: number; // 0..8
    rotationDeg: number;
    scale: number;
    colorHex: string;
    paletteColorKey?: GlyphPaletteColorKey;
    lineThickness?: number;
    radialPositionFactor?: number;
    animation?: GlyphAnimationEnvelope;
}

export interface GlyphPulseConfig extends GlyphAnimationEnvelope {
    delayMsByPosition: number[];
}

export interface GlyphConfig {
    id: string;
    placements: GlyphPlacement[];
    pulse: GlyphPulseConfig;
}

export const PALETTE = [
    "#311617",
    "#522325",
    "#295227",
    "#4b284e",
    "#770a23",
] as const;

export type PaletteColor = (typeof PALETTE)[number];

/** Row-major 3×3 grid: (gx, gy) for positions 0..8 */
export const GLYPH_POSITION_COORDS: readonly [number, number][] = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [0, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
];

export const DELAY_STEP_MS = 60;
export const DELAY_BASE = 4;
export const DELAY_SIGNATURE_LEN = 9;
export const MAX_GLYPH_CAPACITY = Math.pow(DELAY_BASE, DELAY_SIGNATURE_LEN);
