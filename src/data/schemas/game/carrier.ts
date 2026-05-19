import { z } from "zod";

export const DEFAULT_CARRIER_SETTINGS = {
    displayId: "egg",
    radius: 12,
} as const;

export const CarrierSettingsSchema = z.object({
    displayId: z.string().default(DEFAULT_CARRIER_SETTINGS.displayId),
    radius: z.number().min(1).default(DEFAULT_CARRIER_SETTINGS.radius),
});

export type CarrierSettings = z.infer<typeof CarrierSettingsSchema>;
