import { z } from "zod";

export const ResolvedTutorialAttentionPlanSchema = z.object({
    hideNotifications: z.boolean(),
    hideTimeControls: z.boolean(),
    pauseGame: z.boolean(),
    focusEntityIds: z.array(z.string()),
    ringEntityIds: z.array(z.string()),
    cameraFocusEntityId: z.string().nullable(),
    blockNonFocusedInteraction: z.boolean(),
});
