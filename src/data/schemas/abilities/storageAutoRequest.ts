import { z } from "zod";

export const StorageAutoRequestSchema = z
    .object({
        enabled: z.boolean().default(false),
        cadence_s: z.number().positive().default(1),
        source: z.string().optional(),
        minRequest: z.number().nonnegative().default(1),
        maxRequest: z.number().positive().default(999999),
    })
    .refine((data) => data.minRequest <= data.maxRequest, {
        message: "minRequest must be <= maxRequest",
    });

export type StorageAutoRequestConfig = z.infer<typeof StorageAutoRequestSchema>;
