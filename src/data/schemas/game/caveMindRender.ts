import { z } from "zod";
import {
    CaveContourOctaveSchema,
    CavePulseOctaveSchema,
    DEFAULT_CAVE_DISPLAY_CONFIG,
} from "./caveDisplay";

const defaultFur = DEFAULT_CAVE_DISPLAY_CONFIG.fur;

export const CaveFurRenderSchema = z.object({
    lookDirX: z.number().default(0),
    lookDirY: z.number().default(0),
    sampleCount: z.number().int().default(defaultFur.sampleCount),
    bodyRadiusScale: z.number().default(defaultFur.bodyRadiusScale),
    hairStride: z.number().int().default(defaultFur.hairStride),
    midpointRatio: z.number().default(defaultFur.midpointRatio),
    baseOctaves: z
        .array(CaveContourOctaveSchema)
        .default(defaultFur.baseOctaves),
    pulseOctaves: z
        .array(CavePulseOctaveSchema)
        .default(defaultFur.pulseOctaves),
    lengthPx: z.number().default(defaultFur.lengthPx.base),
    rootWidthPx: z.number().default(defaultFur.rootWidthPx.base),
    tipWidthPx: z.number().default(defaultFur.tipWidthPx.base),
    flareAngleRad: z.number().default(defaultFur.flareAngleRad.base),
    swayAngleRad: z.number().default(defaultFur.swayAngleRad.base),
    curlAngleRad: z.number().default(defaultFur.curlAngleRad.base),
    stiffness01: z.number().default(defaultFur.stiffness01.base),
    tremorPx: z.number().default(defaultFur.tremorPx.base),
    motionHz: z.number().default(defaultFur.motionHz.base),
    pulseLengthScale: z.number().default(defaultFur.pulseLengthScale.base),
    pulseAngleRad: z.number().default(defaultFur.pulseAngleRad.base),
    attentionBias01: z.number().default(defaultFur.attentionBias01.base),
});

export const DEFAULT_CAVE_FUR_RENDER = CaveFurRenderSchema.parse({});

export const CaveRenderSchema = z.object({
    eyeShape: z
        .enum(["neutral", "happy", "unhappy", "scared", "anticipating"])
        .default("neutral"),
    eyeColor: z.string().default("#f7d96f"),
    eyeOffsetX: z.number().min(-1).max(1).default(0),
    eyeOffsetY: z.number().min(-1).max(1).default(0),
    pupilSize: z.number().min(0).max(1).default(0.45),
    pupilOffsetX: z.number().min(-1).max(1).default(0),
    pupilOffsetY: z.number().min(-1).max(1).default(0),
    blinkIntervalMs: z.number().default(3200),
    blinkDurationMs: z.number().default(180),
    blinkPhaseMs: z.number().default(0),
    fur: CaveFurRenderSchema.default(DEFAULT_CAVE_FUR_RENDER),
});

export const DEFAULT_CAVE_RENDER = CaveRenderSchema.parse({});

export type CaveFurRender = z.infer<typeof CaveFurRenderSchema>;
export type CaveRender = z.infer<typeof CaveRenderSchema>;
