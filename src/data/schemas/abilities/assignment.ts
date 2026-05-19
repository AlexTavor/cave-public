import { z } from "zod";
import {
    AssignmentFilterRuleSchema,
    AssignmentMinimumRuleSchema,
} from "../assignmentRules";

const AssignmentSourceSchema = z.enum(["fixed", "attribute", "lifetime_xp"]);
const AssignmentAttributeSchema = z.enum(["body", "mind", "social"]);

export const AssignmentSpawnResourceResultSchema = z
    .object({
        type: z.literal("spawn_resource"),
        resource: z.string().min(1),
        source: AssignmentSourceSchema,
        attribute: AssignmentAttributeSchema.optional(),
        factor: z.number().default(1),
        target: z.string().default("sys_world"),
    })
    .superRefine((value, ctx) => {
        if (value.source === "attribute" && !value.attribute) {
            ctx.addIssue({
                code: "custom",
                path: ["attribute"],
                message: "Attribute source requires an attribute.",
            });
        }
        if (value.source !== "attribute" && value.attribute !== undefined) {
            ctx.addIssue({
                code: "custom",
                path: ["attribute"],
                message: "Only attribute sources may set an attribute.",
            });
        }
    });

const AssignmentResultSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("destroy_assigned_bodies") }),
    AssignmentSpawnResourceResultSchema,
    z.object({ type: z.literal("transfer_habiti") }),
]);

const validateSingletonResult = (
    results: AssignmentResultConfig[],
    type: "destroy_assigned_bodies" | "transfer_habiti",
    ctx: z.RefinementCtx,
) => {
    if (results.filter((entry) => entry.type === type).length > 1) {
        ctx.addIssue({
            code: "custom",
            path: ["results"],
            message: `Assignment results may only include one '${type}' entry.`,
        });
    }
};

export const ProcessingOutputConfigSchema = z.object({
    resource: z.string().min(1),
    source: AssignmentSourceSchema,
    attribute: AssignmentAttributeSchema.optional(),
    factor: z.number().default(1),
    target: z.string().default("sys_world"),
});

export const AssignmentAbilitySchema = z
    .object({
        slots: z.number().min(0).default(1),
        locking: z.boolean().default(false),
        filter: z.array(AssignmentFilterRuleSchema).optional().default([]),
        minimums: z.array(AssignmentMinimumRuleSchema).optional().default([]),
        duration: z.number().min(0).default(0),
        showProgress: z.boolean().optional(),
        oneOff: z.boolean().default(false),
        results: z.array(AssignmentResultSchema).default([]),
    })
    .superRefine((value, ctx) => {
        validateSingletonResult(value.results, "destroy_assigned_bodies", ctx);
        validateSingletonResult(value.results, "transfer_habiti", ctx);
    });

export type AssignmentAbilityConfig = z.infer<typeof AssignmentAbilitySchema>;
export type AssignmentResultConfig = z.infer<typeof AssignmentResultSchema>;
export type AssignmentSpawnResourceResultConfig = z.infer<
    typeof AssignmentSpawnResourceResultSchema
>;

