import { z } from "zod";
import { ScalableValueSchema } from "./utils";

export const UpkeepAbilitySchema = z.object({
    resource: z.string().min(1),
    displayName: z.string().optional(),
    rate: ScalableValueSchema.default({ base: 0, perBody: 0, multPerBody: 0 }),
    failureTrait: z.string().min(1),
    autoRequest: z.boolean().default(true),
    isImmediate: z.boolean().optional(),
    requestSource: z.string().optional(),
});

export type UpkeepAbilityConfig = z.infer<typeof UpkeepAbilitySchema>;

