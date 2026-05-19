import { z } from "zod";
import { ModalGuidanceContentSchema } from "./guidances";

export const ShowNotificationAbilityGuidanceActionSchema =
    ModalGuidanceContentSchema.extend({
        type: z.literal("SHOW_NOTIFICATION_ABILITY_GUIDANCE"),
        abilityId: z.string().min(1),
    });

export type ShowNotificationAbilityGuidanceAction = z.infer<
    typeof ShowNotificationAbilityGuidanceActionSchema
>;
