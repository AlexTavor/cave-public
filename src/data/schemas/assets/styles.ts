import { z } from "zod";

const STYLE_FAMILIES = [
    "none",
    "circle",
    "triangle",
    "square",
    "hex",
    "spiky_circle",
] as const;
const LightBlendModeSchema = z.enum(["NORMAL", "ADD"]);
const StyleLightSchema = z
    .object({
        color: z.string(),
        alpha: z.number().min(0).max(1),
        radiusFactor: z.number().positive(),
        blendMode: LightBlendModeSchema,
    })
    .strict();

const CycleProgressStyleSchema = z
    .object({
        family: z.enum(STYLE_FAMILIES),
        familyRotationDeg: z.number().default(0),
        color: z.string(),
    })
    .strict();

export const DisplayStyleSchema = z
    .object({
        cycleProgress: CycleProgressStyleSchema.optional(),
        light: StyleLightSchema.optional(),
    })
    .strict();

export type DisplayStyle = z.output<typeof DisplayStyleSchema>;

export const EntityStyleSchema = DisplayStyleSchema;

export type EntityStyle = DisplayStyle;

