import { z } from "zod";

export const SpatialRadiusSchema = z.object({
    min: z.number().default(10),
    max: z.number().default(20),
    valueRef: z.string().optional(),
    maxRef: z.string().optional(),
});

export const SpatialComponentSchema = z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    radius: SpatialRadiusSchema,
});

export type SpatialComponent = z.infer<typeof SpatialComponentSchema>;
