import { z } from "zod";
import { AttributeSetSchema } from "../game/body";
import { BehaviorRuleSchema } from "../behavior";

export const BodyAbilitySchema = z.object({
    baseAttributes: AttributeSetSchema.default({
        body: 1,
        mind: 1,
        social: 1,
    }),
    health: z.number().default(100),
    traits: z.array(z.string()).default([]),
    xp: z.number().default(0),
    level: z.number().default(1),
    rules: z.array(BehaviorRuleSchema).optional(),
});

export type BodyAbilityConfig = z.infer<typeof BodyAbilitySchema>;
