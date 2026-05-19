import { z } from "zod";
export { DEFAULT_CAVE_DISPLAY_CONFIG } from "./caveDisplay.defaults";

export const CaveSignalDriverSchema = z
    .object({
        base: z.number(),
        comfortWeight: z.number(),
        focusWeight: z.number(),
        happinessWeight: z.number(),
        sadnessWeight: z.number(),
        terrorWeight: z.number(),
        curiosityWeight: z.number(),
        min: z.number(),
        max: z.number(),
    })
    .refine((value) => value.min <= value.max, "min must be <= max");
export const CaveContourOctaveSchema = z.object({
    frequency: z.number(),
    amplitudePx: z.number(),
});
export const CavePulseOctaveSchema = z.object({
    frequency: z.number(),
    amplitudePx: z.number(),
    speedHz: z.number(),
});
export const CaveEyeMotionConfigSchema = z.object({
    eyeTravel: z.number(),
    eyeDriftTravel: z.number(),
    eyeDriftStepX: z.number(),
    eyeDriftStepY: z.number(),
    pupilTravel: z.number(),
    minBlinkMs: z.number(),
    maxBlinkMs: z.number(),
});
export const CaveFurConfigSchema = z
    .object({
        sampleCount: z.number().int().min(16),
        bodyRadiusScale: z.number(),
        hairStride: z.number().int().min(1),
        midpointRatio: z.number().gt(0).lt(1),
        baseOctaves: z.array(CaveContourOctaveSchema),
        pulseOctaves: z.array(CavePulseOctaveSchema),
        lengthPx: CaveSignalDriverSchema,
        rootWidthPx: CaveSignalDriverSchema,
        tipWidthPx: CaveSignalDriverSchema,
        flareAngleRad: CaveSignalDriverSchema,
        swayAngleRad: CaveSignalDriverSchema,
        curlAngleRad: CaveSignalDriverSchema,
        stiffness01: CaveSignalDriverSchema,
        tremorPx: CaveSignalDriverSchema,
        motionHz: CaveSignalDriverSchema,
        pulseLengthScale: CaveSignalDriverSchema,
        pulseAngleRad: CaveSignalDriverSchema,
        attentionBias01: CaveSignalDriverSchema,
    })
    .refine((value) => value.hairStride < value.sampleCount, {
        message: "hairStride must be < sampleCount",
        path: ["hairStride"],
    })
    .refine((value) => value.tipWidthPx.max <= value.rootWidthPx.max, {
        message: "tipWidthPx.max must be <= rootWidthPx.max",
        path: ["tipWidthPx", "max"],
    });
export const CaveDisplayConfigSchema = z.object({
    eyes: CaveEyeMotionConfigSchema,
    fur: CaveFurConfigSchema,
});

export type CaveSignalDriver = z.infer<typeof CaveSignalDriverSchema>;
export type CaveContourOctave = z.infer<typeof CaveContourOctaveSchema>;
export type CavePulseOctave = z.infer<typeof CavePulseOctaveSchema>;
export type CaveEyeMotionConfig = z.infer<typeof CaveEyeMotionConfigSchema>;
export type CaveFurConfig = z.infer<typeof CaveFurConfigSchema>;
export type CaveDisplayConfig = z.infer<typeof CaveDisplayConfigSchema>;
