import { nanoid } from "nanoid";
import { z } from "zod";
import { ConditionLinesSchema } from "./conditions";
import { BehaviorActionSchema } from "../behavior";
import { AbilityTriggersSchema } from "./triggers";

export const DraftAbilitySchema = z.object({
    id: z.string().default(() => nanoid()),
    poolId: z.string().min(1),
    count: z.number().min(1).max(5).default(3),
    label: z.string().optional(),
    triggers: AbilityTriggersSchema.optional().default(["cycle_complete"]),
    conditions: ConditionLinesSchema.optional().default([]),
    onComplete: z.array(BehaviorActionSchema).optional(),
});

export type DraftAbilityConfig = z.input<typeof DraftAbilitySchema>;

