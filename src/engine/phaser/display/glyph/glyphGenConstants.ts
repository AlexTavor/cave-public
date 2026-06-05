import type { GlyphShape } from "../../../../data/schemas/assets/GlyphTypes";

export const CORE_SHAPES: readonly GlyphShape[] = [
    "ring",
    "hex_ring",
    "oct_ring",
    "square_ring",
    "circle",
    "star5",
    "star6",
];

export const SAT_SHAPES: readonly GlyphShape[] = [
    "line",
    "chevron",
    "crescent",
    "hole",
    "triangle",
    "circle",
    "pixel",
    "star5",
    "star6",
    "ring",
];

export const SAT_SCALE_CHOICES = [0.75, 1, 1.5] as const;

export const TEMPLATES: readonly (readonly number[])[] = [
    [1, 3, 5, 7], // CROSS_4
    [0, 2, 6, 8], // CORNERS_4
    [0, 1, 2], // TOP_3
    [6, 7, 8], // BOT_3
    [0, 3, 6], // LEFT_3
    [2, 5, 8], // RIGHT_3
    [0, 8], // DIAG_MAIN_2
    [2, 6], // DIAG_ANTI_2
    [0, 7, 2], // V_3
    [1, 6, 8], // ARROW_DOWN_3
];

export const ROTATION_SETS: Record<GlyphShape, readonly number[]> = {
    line: [0, 45, 90, 135],
    chevron: [0, 90, 180, 270],
    crescent: [0, 90, 180, 270],
    hole: [0],
    triangle: [0, 90, 180, 270],
    star5: [0, 36, 72, 108, 144],
    star6: [0, 30, 60, 90, 120, 150],
    circle: [0],
    pixel: [0],
    ring: [0],
    hex_ring: [0],
    oct_ring: [0],
    square_ring: [0],
    plus_rounded: [0],
    chevron_up_rounded: [0, 90, 180, 270],
    triple_circle: [0],
};

export const DIST_FACTOR_PAIRS: readonly [number, number][] = [
    [0.5, 0.7],
    [0.55, 0.75],
    [0.6, 0.8],
];

export const SCALE_PULSE_PAIRS: readonly [number, number][] = [
    [0.96, 1.04],
    [0.95, 1.05],
    [0.94, 1.06],
];

export const ROT_DELTA_PAIRS: readonly [number, number][] = [
    [-4, 4],
    [-6, 6],
    [-8, 8],
    [-12, 12],
];

export const CORE_SCALE = 1;
