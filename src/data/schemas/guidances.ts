import { z } from "zod";
import { EntityTargetSpecSchema } from "./targetSpec";

const NodeCalloutSlotSchema = z.enum([
    "top",
    "top_right",
    "right",
    "bottom_right",
    "bottom",
    "bottom_left",
    "left",
    "top_left",
]);
const ScreenCalloutSlotSchema = z.enum([
    "top_left",
    "top_right",
    "bottom_left",
    "bottom_right",
    "center",
]);

export const ModalGuidanceContentSchema = z.object({
    title: z.string().default(""),
    text: z.string().min(1),
    imageUrl: z.string().nullable().default(null),
});

export const GuidanceAttentionMechanismSchema = z.enum([
    "stop_time",
    "hide_time_controls",
    "hide_notifications",
    "hide_all_but_self",
    "show_attention_effect_on_self",
]);

const SharedGuidanceSchema = z
    .object({
        id: z.string().min(1),
        attention: z.array(GuidanceAttentionMechanismSchema).default([]),
    })
    .strict();

const VisualGuidanceSchema = SharedGuidanceSchema.extend({
    imageUrl: z.string().nullable().default(null),
}).strict();

const NodeCalloutGuidanceSchema = VisualGuidanceSchema.extend({
    presentation: z.literal("node_callout"),
    target: EntityTargetSpecSchema,
    slot: NodeCalloutSlotSchema,
    text: z.string().min(1),
}).strict();

const ScreenCalloutGuidanceSchema = VisualGuidanceSchema.extend({
    presentation: z.literal("screen_callout"),
    text: z.string().min(1),
    screenSlot: ScreenCalloutSlotSchema,
}).strict();

const ModalGuidanceSchema = VisualGuidanceSchema.extend({
    presentation: z.literal("modal"),
})
    .extend(ModalGuidanceContentSchema.shape)
    .strict();

const DraftGuidanceSchema = SharedGuidanceSchema.extend({
    presentation: z.literal("draft_guidance"),
    targetOptionId: z.string().min(1),
}).strict();

export const GuidanceDefinitionSchema = z.discriminatedUnion("presentation", [
    NodeCalloutGuidanceSchema,
    ScreenCalloutGuidanceSchema,
    ModalGuidanceSchema,
    DraftGuidanceSchema,
]);

export const GuidancesSchema = z
    .array(GuidanceDefinitionSchema)
    .superRefine((guidances, context) => {
        const seen = new Set<string>();
        guidances.forEach((guidance, index) => {
            if (seen.has(guidance.id)) {
                context.addIssue({
                    code: "custom",
                    message: `Duplicate guidance id '${guidance.id}'.`,
                    path: [index, "id"],
                });
            }
            seen.add(guidance.id);
            const invalid = guidance.attention.filter((item) =>
                guidance.presentation === "node_callout"
                    ? false
                    : item === "hide_all_but_self" ||
                      item === "show_attention_effect_on_self",
            );
            invalid.forEach((item) =>
                context.addIssue({
                    code: "custom",
                    message: `${item} is invalid for ${guidance.presentation}.`,
                    path: [index, "attention"],
                }),
            );
        });
    });

export type GuidanceDefinition = z.infer<typeof GuidanceDefinitionSchema>;
export type ModalGuidanceContent = z.infer<typeof ModalGuidanceContentSchema>;
export type GuidanceAttentionMechanism = z.infer<
    typeof GuidanceAttentionMechanismSchema
>;
