import { z } from "zod";

const CoordinateAnchorSchema = z.object({
    type: z.literal("coordinate"),
    x: z.number(),
    y: z.number(),
    stiffness: z.number().default(0.1),
});

const EntityAnchorSchema = z.object({
    type: z.literal("entity"),
    entityId: z.string(),
    distance: z.number().default(0),
    stiffness: z.number().default(0.1),
    offsetX: z.number().default(0),
    offsetY: z.number().default(0),
    mode: z.enum(["soft", "hard"]).default("soft"),
});

export const AnchorSchema = z.union([
    CoordinateAnchorSchema,
    EntityAnchorSchema,
]);

export type AnchorConfig = z.infer<typeof AnchorSchema>;
export type CoordinateAnchorConfig = z.infer<typeof CoordinateAnchorSchema>;
export type EntityAnchorConfig = z.infer<typeof EntityAnchorSchema>;
