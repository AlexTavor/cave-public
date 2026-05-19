import { z } from "zod";
import { BehaviorRuleSchema } from "../behavior";
import { PassiveEffectSchema } from "../components";

export const TraitCycleSchema = z.object({
    id: z.string().min(1),
    periodSeconds: z.number().positive(),
    effects: z.array(PassiveEffectSchema),
});

export const TraitDefinitionSchema = z.object({
    id: z.string(),
    label: z.string(),
    description: z.string().optional(),
    modifiers: z.array(PassiveEffectSchema).optional(),
    cycles: z.array(TraitCycleSchema).optional(),
    rules: z.array(BehaviorRuleSchema).optional(),
});

export type TraitDefinition = z.infer<typeof TraitDefinitionSchema>;
export type TraitCycle = z.infer<typeof TraitCycleSchema>;

