import { z } from "zod";
import { EntityTargetSpecSchema } from "../targetSpec";

export const PASSPORT_NERVOUS_VEIN_TAG = "sys:passport:nervous_vein";
export const PASSPORT_PERMANENT_TAG = "sys:passport:permanent";

export const PassportAbilitySchema = z.object({
    label: z.string().default("Unknown"),
    icon: z
        .string()
        .optional()
        .describe("ui:icon: Optional display key override."),
    glyphKey: z.string().optional(),
    description: z.string().optional(),
    styleId: z.string().describe("ui:style").optional(),
    parent: EntityTargetSpecSchema.optional(),
    nervousVein: z.boolean().default(false),
    permanent: z.boolean().default(false),
});

export type PassportAbilityConfig = z.input<typeof PassportAbilitySchema>;

