import { z } from "zod";
import { ResolvedTutorialAttentionPlanSchema } from "./tutorial.internal";

const finiteNumber = z
    .number()
    .refine(Number.isFinite, "Expected finite number");
const ResourceTotalSchema = z.object({
    resource: z.string().min(1),
    amount: finiteNumber,
});
const HabitiAnnouncementItemSchema = z.object({
    habitusIds: z.array(z.string().min(1)).default([]),
    xpTotal: finiteNumber.default(0),
    resourceTotals: z.array(ResourceTotalSchema).default([]),
});

export const HabitiAnnouncementComponentSchema = z.object({
    _tag: z.literal("habiti_announcement"),
    active: z.boolean().default(false),
    current: HabitiAnnouncementItemSchema.nullable().default(null),
    queue: z.array(HabitiAnnouncementItemSchema).default([]),
    attention: ResolvedTutorialAttentionPlanSchema,
});

export const DEFAULT_HABITI_ANNOUNCEMENT_COMPONENT =
    HabitiAnnouncementComponentSchema.parse({
        _tag: "habiti_announcement",
        active: false,
        current: null,
        queue: [],
        attention: {
            hideNotifications: true,
            hideTimeControls: true,
            pauseGame: true,
            focusEntityIds: [],
            ringEntityIds: [],
            cameraFocusEntityId: null,
            blockNonFocusedInteraction: false,
        },
    });

export type HabitiAnnouncementComponent = z.infer<
    typeof HabitiAnnouncementComponentSchema
>;
export type HabitiAnnouncementItem = z.infer<
    typeof HabitiAnnouncementItemSchema
>;
