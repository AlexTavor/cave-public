import { z } from "zod";

export const ScalableValueSchema = z.object({
    base: z.number().default(0),
    perBody: z.number().default(0),
    multPerBody: z.number().default(0),
});

export type ScalableValue = z.infer<typeof ScalableValueSchema>;
