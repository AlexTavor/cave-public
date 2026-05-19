import { z } from "zod";
import { ResolvedTutorialAttentionPlanSchema } from "./tutorial.internal";

const TutorialGuidanceBindingSchema = z.object({
    bindingId: z.string(),
    guidanceId: z.string(),
    targetId: z.string().nullable(),
    selfTargetId: z.string().nullable().default(null),
    targetOptionId: z.string().nullable(),
    textOverride: z.string().nullable(),
});

export const TutorialComponentSchema = z.object({
    _tag: z.literal("tutorial"),
    active: z.boolean(),
    tutorialId: z.string().nullable(),
    selfId: z.string().nullable(),
    primaryTargetId: z.string().nullable(),
    acknowledgedModalBindingId: z.string().nullable().default(null),
    bindings: z.array(TutorialGuidanceBindingSchema),
    attention: ResolvedTutorialAttentionPlanSchema,
});

export const DEFAULT_TUTORIAL_COMPONENT = TutorialComponentSchema.parse({
    _tag: "tutorial",
    active: false,
    tutorialId: null,
    selfId: null,
    primaryTargetId: null,
    acknowledgedModalBindingId: null,
    bindings: [],
    attention: {
        hideNotifications: false,
        hideTimeControls: false,
        pauseGame: false,
        focusEntityIds: [],
        ringEntityIds: [],
        cameraFocusEntityId: null,
        blockNonFocusedInteraction: false,
    },
});

export type TutorialComponent = z.infer<typeof TutorialComponentSchema>;
export type TutorialGuidanceBinding = z.infer<
    typeof TutorialGuidanceBindingSchema
>;
export type ResolvedTutorialAttentionPlan = z.infer<
    typeof ResolvedTutorialAttentionPlanSchema
>;
