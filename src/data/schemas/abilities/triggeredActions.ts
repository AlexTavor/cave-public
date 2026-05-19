import { nanoid } from "nanoid";
import { z } from "zod";
import { BehaviorActionSchema } from "../behavior";
import { ConditionLinesSchema } from "./conditions";
import { AbilityTriggersSchema } from "./triggers";

export const TriggeredActionsAbilitySchema = z.object({
    id: z.string().default(() => nanoid()),
    triggers: AbilityTriggersSchema.optional().default(["cycle_complete"]),
    conditions: ConditionLinesSchema.optional().default([]),
    actions: z.array(BehaviorActionSchema).min(1),
});

export type TriggeredActionsAbilityConfig = z.infer<
    typeof TriggeredActionsAbilitySchema
>;
