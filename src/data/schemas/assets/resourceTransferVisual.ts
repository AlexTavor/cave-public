import { z } from "zod";

const finite = () => z.number().refine(Number.isFinite);
const alpha = () => finite().min(0).max(1);

export const TransferBlendModeSchema = z.enum(["NORMAL", "ADD"]);
export const TransferShapeSchema = z.enum(["circle", "rect", "hex"]);

export const TransferLightVisualSchema = z.object({
    shape: TransferShapeSchema,
    color: z.string(),
    alpha: alpha(),
    radiusFactor: finite().positive(),
    blendMode: TransferBlendModeSchema,
});

export const TransferParticlesVisualSchema = z.object({
    shape: TransferShapeSchema,
    color: z.string(),
    speed: z
        .object({
            min: finite().min(0),
            max: finite().min(0),
        })
        .refine(({ min, max }) => max >= min),
    lifespan: finite().positive(),
    scale: z.object({
        start: finite().min(0),
        end: finite().min(0),
    }),
    alpha: z.object({
        start: alpha(),
        end: alpha(),
    }),
    frequency: finite().min(0),
    quantity: z.number().int().min(1),
    blendMode: TransferBlendModeSchema,
});

export const TransferVisualSchema = z.object({
    glyphPresetKey: z.string(),
    glyphColor: z.string(),
    light: TransferLightVisualSchema,
    particles: TransferParticlesVisualSchema,
});

export type TransferBlendMode = z.infer<typeof TransferBlendModeSchema>;
export type TransferShape = z.infer<typeof TransferShapeSchema>;
export type TransferLightVisual = z.infer<typeof TransferLightVisualSchema>;
export type TransferParticlesVisual = z.infer<
    typeof TransferParticlesVisualSchema
>;
export type TransferVisual = z.infer<typeof TransferVisualSchema>;
