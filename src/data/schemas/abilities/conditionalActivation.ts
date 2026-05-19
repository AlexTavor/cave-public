import { z } from "zod";
import { StructuredConditionSchema } from "../conditions";

export const ConditionalActivationAbilityKeys = [
    "cycle",
    "storage",
    "production",
    "injection",
    "conversion",
    "upkeep",
    "assignment",
    "spawner",
    "sampler",
    "body",
    "passport",
    "worldPresence",
    "draft",
    "updater",
    "triggeredActions",
    "notifications",
] as const;

export const ConditionalActivationTargetSchema = z.object({
    ability: z.enum(ConditionalActivationAbilityKeys),
    targetId: z.string().optional(),
});

export const ConditionalActivationAbilityEntrySchema = z.object({
    priority: z.number().default(0),
    conditions: z.array(StructuredConditionSchema).optional().default([]),
    targets: z.array(ConditionalActivationTargetSchema).default([]),
    inactiveExplanation: z.string().optional(),
});

export const ConditionalActivationAbilitySchema = z.union([
    ConditionalActivationAbilityEntrySchema,
    z.array(ConditionalActivationAbilityEntrySchema),
]);

export type ConditionalActivationTarget = z.input<
    typeof ConditionalActivationTargetSchema
>;
export type ConditionalActivationAbilityConfig = z.input<
    typeof ConditionalActivationAbilityEntrySchema
>;
export type ConditionalActivationAbilityValue =
    | z.input<typeof ConditionalActivationAbilitySchema>
    | undefined;

export const normalizeConditionalActivationConfigs = (
    value?: ConditionalActivationAbilityValue,
): ConditionalActivationAbilityConfig[] => {
    if (!value) return [];
    const entries = Array.isArray(value) ? value : [value];
    return entries.map((entry) =>
        ConditionalActivationAbilityEntrySchema.parse(entry),
    );
};
