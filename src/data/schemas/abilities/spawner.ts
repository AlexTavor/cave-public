import { nanoid } from "nanoid";
import { z } from "zod";
import { StructuredConditionSchema } from "../conditions";
import { ScalableValueSchema } from "./utils";
import { AbilityTriggersSchema } from "./triggers";

const ForcedHabitiSchema = z
    .array(z.string().trim().min(1))
    .optional()
    .default([])
    .superRefine((ids, ctx) => {
        const seen = new Set<string>();
        for (const id of ids) {
            if (!seen.has(id)) {
                seen.add(id);
                continue;
            }
            ctx.addIssue({
                code: "custom",
                message: `Duplicate forced habitus '${id}'.`,
            });
            return;
        }
    });

export const SpawnerAbilitySchema = z.object({
    id: z.string().default(() => nanoid()),
    blueprintId: z.string().min(1),
    count: ScalableValueSchema.default({ base: 1, perBody: 0, multPerBody: 0 }),
    mode: z.enum(["spawn", "spawn_body"]).default("spawn_body"),
    target: z.string().default("sys_world"),
    parentOnSpawn: z.enum(["none", "self"]).optional().default("none"),
    forcedHabiti: ForcedHabitiSchema,
    triggers: AbilityTriggersSchema.optional().default(["cycle_complete"]),
    conditions: z.array(StructuredConditionSchema).optional().default([]),
});

export type SpawnerAbilityConfig = z.input<typeof SpawnerAbilitySchema>;

