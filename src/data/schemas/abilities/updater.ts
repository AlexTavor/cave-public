import { nanoid } from "nanoid";
import { z } from "zod";
import { ActionValueSchema } from "../behavior";
import { ConditionLinesSchema } from "./conditions";
import { AbilityTriggersSchema } from "./triggers";

export const UpdaterAbilitySchema = z.object({
    id: z.string().default(() => nanoid()),
    target: z.string(),
    op: z.enum(["SET", "ADD", "SUB"]).default("ADD"),
    value: ActionValueSchema.default(1),
    triggers: AbilityTriggersSchema.optional().default(["cycle_complete"]),
    conditions: ConditionLinesSchema.optional().default([]),
});

export type UpdaterAbilityConfig = z.input<typeof UpdaterAbilitySchema>;

