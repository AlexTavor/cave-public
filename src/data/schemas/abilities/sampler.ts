import { nanoid } from "nanoid";
import { z } from "zod";
import { AbilityTriggersSchema } from "./triggers";

export const SamplerAbilitySchema = z.object({
    id: z.string().default(() => nanoid()),
    source: z.string().min(1),
    target: z.string().default("sampled_value"),
    visible: z.boolean().default(true),
    max: z.number().default(100),
    triggers: AbilityTriggersSchema.optional().default(["cycle_complete"]),
});

export type SamplerAbilityConfig = z.input<typeof SamplerAbilitySchema>;

