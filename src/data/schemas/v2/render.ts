import { z } from "zod";

export const RenderBarSchema = z.object({
    key: z.string(),
    max: z.number().optional(),
    color: z.string().optional(),
});

export const ReactiveScaleSchema = z.object({
    min: z.number(),
    max: z.number(),
    valueRef: z.string().optional(),
    maxRef: z.string().optional(),
});

export const RenderComponentSchema = z.object({
    label: z.string(),
    icon: z.string(),
    description: z.string().optional(),
    tooltip: z.string().optional(),
    styleId: z.string(),
    color: z.string().optional(),
    reactiveScale: ReactiveScaleSchema.optional(),
    bars: z.array(RenderBarSchema).optional(),
});

export type RenderComponent = z.infer<typeof RenderComponentSchema>;
