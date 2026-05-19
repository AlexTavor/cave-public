import { z } from "zod";
import { DISPLAY_PALETTE_KEYS } from "../../../lib/displays/displayKeyKinds";
import { RESOURCE_PROGRESS_BAR_POSITIONS } from "../../../lib/displays/resourceProgressBarSlots";
import { ScalableValueSchema } from "./utils";
import { StorageAutoRequestSchema } from "./storageAutoRequest";

export const StorageAbilitySchema = z.object({
    resource: z.string().min(1),
    displayName: z.string().optional(),
    initialValue: z.number().min(0).default(0),
    capacity: ScalableValueSchema.default({
        base: 0,
        perBody: 0,
        multPerBody: 0,
    }),
    isDefault: z.boolean().default(true),
    entropy: ScalableValueSchema.default({
        base: 0,
        perBody: 0,
        multPerBody: 0,
    }),
    visible: z.boolean().default(true),
    barPosition: z.enum(RESOURCE_PROGRESS_BAR_POSITIONS).optional(),
    barColorHex: z.string().optional(),
    barPaletteColorKey: z.enum(DISPLAY_PALETTE_KEYS).optional(),
    allowDeposit: z.boolean().default(true),
    allowWithdraw: z.boolean().default(true),
    priority: z.number().default(0),
    autoRequest: StorageAutoRequestSchema.optional(),
});

export type StorageAbilityConfig = z.infer<typeof StorageAbilitySchema>;

