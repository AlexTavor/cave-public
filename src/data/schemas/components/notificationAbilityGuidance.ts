import { z } from "zod";
import { ResolvedTutorialAttentionPlanSchema } from "./tutorial.internal";

export const NotificationAbilityGuidanceItemSchema = z.object({
    abilityId: z.string().min(1),
    title: z.string().default(""),
    text: z.string().min(1),
    imageUrl: z.string().nullable().default(null),
});

export const NotificationAbilityGuidanceComponentSchema = z.object({
    _tag: z.literal("notification_ability_guidance"),
    active: z.boolean().default(false),
    current: NotificationAbilityGuidanceItemSchema.nullable().default(null),
    queue: z.array(NotificationAbilityGuidanceItemSchema).default([]),
    attention: ResolvedTutorialAttentionPlanSchema,
});

export const DEFAULT_NOTIFICATION_ABILITY_GUIDANCE_COMPONENT =
    NotificationAbilityGuidanceComponentSchema.parse({
        _tag: "notification_ability_guidance",
        active: false,
        current: null,
        queue: [],
        attention: {
            hideNotifications: false,
            hideTimeControls: true,
            pauseGame: true,
            focusEntityIds: [],
            ringEntityIds: [],
            cameraFocusEntityId: null,
            blockNonFocusedInteraction: false,
        },
    });

export type NotificationAbilityGuidanceComponent = z.infer<
    typeof NotificationAbilityGuidanceComponentSchema
>;
export type NotificationAbilityGuidanceItem = z.infer<
    typeof NotificationAbilityGuidanceItemSchema
>;
