import { z } from "zod";

export const AbilityTriggerKindSchema = z.enum([
    "cycle_complete",
    "assignment_complete",
]);

export const AbilityTriggersSchema = z
    .array(AbilityTriggerKindSchema)
    .min(1)
    .default(["cycle_complete"]);

export type AbilityTriggerKind = z.infer<typeof AbilityTriggerKindSchema>;
