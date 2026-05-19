import { z } from "zod";
import { ScalableValueSchema } from "./utils";
import { ConditionLinesSchema } from "./conditions";
import { AbilityTriggersSchema } from "./triggers";

const ConversionItemSchema = z.object({
    resource: z.string().min(1),
    amount: ScalableValueSchema.default({
        base: 0,
        perBody: 0,
        multPerBody: 0,
    }),
});

const ConversionOutputSchema = ConversionItemSchema.extend({
    target: z.string().optional(),
});

export const ConversionAbilitySchema = z.object({
    id: z.string().default("default"),
    inputs: z.array(ConversionItemSchema).default([]),
    outputs: z.array(ConversionOutputSchema).default([]),
    resetCycle: z.boolean().default(true),
    triggers: AbilityTriggersSchema.optional().default(["cycle_complete"]),
    conditions: ConditionLinesSchema.optional().default([]),
});

export type ConversionAbilityConfig = z.input<typeof ConversionAbilitySchema>;

