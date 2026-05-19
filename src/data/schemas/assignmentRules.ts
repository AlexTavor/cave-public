import { z } from "zod";

const NonEmptyIdsSchema = z.array(z.string().min(1)).min(1);
const FiniteNonNegativeSchema = z.number().refine(Number.isFinite).min(0);

export const AssignmentFilterRuleSchema = z.discriminatedUnion("kind", [
    z.object({
        kind: z.literal("required_habiti_all"),
        ids: NonEmptyIdsSchema,
    }),
    z.object({
        kind: z.literal("required_traits_all"),
        ids: NonEmptyIdsSchema,
    }),
]);

export const AssignmentMinimumRuleSchema = z.discriminatedUnion("kind", [
    z.object({
        kind: z.literal("body_count"),
        required: FiniteNonNegativeSchema,
    }),
    z.object({
        kind: z.literal("attribute_total"),
        attribute: z.enum(["body", "mind", "social"]),
        required: FiniteNonNegativeSchema,
    }),
    z.object({
        kind: z.literal("level_total"),
        required: FiniteNonNegativeSchema,
    }),
]);

export type AssignmentFilterRule = z.infer<typeof AssignmentFilterRuleSchema>;
export type AssignmentMinimumRule = z.infer<typeof AssignmentMinimumRuleSchema>;
