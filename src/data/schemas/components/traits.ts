import { z } from "zod";

export const TraitInstanceSchema = z.object({
    id: z.string().min(1),
    remainingSeconds: z.number().optional(),
    cycles: z
        .record(
            z.string(),
            z.object({ accumulatorSeconds: z.number().default(0) }),
        )
        .optional(),
});

export const TraitsComponentSchema = z.array(TraitInstanceSchema).default([]);

export type TraitInstance = z.infer<typeof TraitInstanceSchema>;
export type TraitsComponent = z.infer<typeof TraitsComponentSchema>;
