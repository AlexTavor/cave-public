import { z } from "zod";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const SusDisplaySchema = z.object({
    text: z.string(),
    color: z.string().regex(HEX_COLOR),
    threshold: z.number().min(0),
});

export const SuspicionNotificationDisplaySchema = z.object({
    text: z.string(),
    color: z.string().regex(HEX_COLOR),
    threshold: z.number().min(0).max(1),
});

export type SusDisplay = z.infer<typeof SusDisplaySchema>;
export type SuspicionNotificationDisplay = z.infer<
    typeof SuspicionNotificationDisplaySchema
>;
