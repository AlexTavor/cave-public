import { nanoid } from "nanoid";
import { z } from "zod";
import { ScalableValueSchema } from "./utils";
import { ConditionLinesSchema } from "./conditions";
import { AbilityTriggersSchema } from "./triggers";

export const ProductionAbilitySchema = z.object({
    id: z.string().default(() => nanoid()),
    resource: z.string().min(1),
    amount: ScalableValueSchema.default({
        base: 0,
        perBody: 0,
        multPerBody: 0,
    }),
    target: z.string().optional(),
    triggers: AbilityTriggersSchema.optional().default(["cycle_complete"]),
    conditions: ConditionLinesSchema.optional().default([]),
});

export type ProductionAbilityConfig = z.input<typeof ProductionAbilitySchema>;

