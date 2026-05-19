import { nanoid } from "nanoid";
import { z } from "zod";
import { ModalGuidanceContentSchema } from "../guidances";

export const NotificationAbilityRuleSchema = ModalGuidanceContentSchema.extend({
    id: z.string().default(() => nanoid()),
});

export const NotificationAbilitySchema = z.array(NotificationAbilityRuleSchema);

export type NotificationAbilityConfig = z.infer<
    typeof NotificationAbilitySchema
>;

