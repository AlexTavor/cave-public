import { z } from "zod";
import { DISPLAY_PALETTE_KEYS } from "../../../lib/displays/displayKeyKinds";
import { RESOURCE_PROGRESS_BAR_POSITIONS } from "../../../lib/displays/resourceProgressBarSlots";

export const StatusLabelSchema = z
    .object({
        key: z.string(),
        max: z.number().optional(),
        maxKey: z.string().optional(),
        color: z.string().optional(),
        label: z.string().optional(),
        position: z.enum(RESOURCE_PROGRESS_BAR_POSITIONS).optional(),
        paletteColorKey: z.enum(DISPLAY_PALETTE_KEYS).optional(),
        spanRatio: z.number().positive().max(1).optional(),
    })
    .refine((value) => value.max !== undefined || value.maxKey !== undefined, {
        message: "StatusLabelSchema requires max or maxKey",
    });

export const DisplayComponentSchema = z.object({
    label: z.string(),
    display_key: z.string().describe("ui:icon"),
    glyphKey: z.string().optional(),
    description: z.string().optional().describe("ui:textarea"),
    radius: z
        .object({
            min: z.number().default(10),
            max: z.number().default(20),
            valueRef: z.string().optional(),
            maxRef: z.string().optional(),
        })
        .optional(),
    style: z.string().optional(),
    bars: z.array(StatusLabelSchema).optional(),
});

