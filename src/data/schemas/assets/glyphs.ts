import { z } from "zod";
import { ALL_GLYPH_SHAPES } from "./GlyphTypes";
import { DISPLAY_PALETTE_KEYS } from "../../../lib/displays/displayKeyKinds";
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_GLYPH_SLOTS = 9;

const refineAnimationEnvelope = (
    value: {
        distanceFromCenterMinFactor: number;
        distanceFromCenterMaxFactor: number;
        scalePulseMin: number;
        scalePulseMax: number;
        rotationDeltaMinDeg: number;
        rotationDeltaMaxDeg: number;
    },
    ctx: z.RefinementCtx,
) => {
    if (
        value.distanceFromCenterMinFactor >= value.distanceFromCenterMaxFactor
    ) {
        ctx.addIssue({ code: "custom", message: "distMin must < distMax" });
    }
    if (value.scalePulseMin >= value.scalePulseMax) {
        ctx.addIssue({ code: "custom", message: "scaleMin must < scaleMax" });
    }
    if (value.rotationDeltaMinDeg >= value.rotationDeltaMaxDeg) {
        ctx.addIssue({ code: "custom", message: "rotMin must < rotMax" });
    }
};

export const GlyphAnimationEnvelopeSchema = z
    .object({
        distanceFromCenterMinFactor: z.number(),
        distanceFromCenterMaxFactor: z.number(),
        scalePulseMin: z.number(),
        scalePulseMax: z.number(),
        rotationDeltaMinDeg: z.number(),
        rotationDeltaMaxDeg: z.number(),
        reverseDirection: z.boolean().optional().default(false),
    })
    .superRefine(refineAnimationEnvelope);

export const GlyphPlacementSchema = z.object({
    shape: z.enum(ALL_GLYPH_SHAPES),
    position: z.number().int().min(0).max(8),
    rotationDeg: z.number(),
    scale: z.number().positive(),
    colorHex: z.string().regex(HEX_COLOR),
    paletteColorKey: z.enum(DISPLAY_PALETTE_KEYS).optional(),
    lineThickness: z.number().positive().optional(),
    radialPositionFactor: z.number().min(0).max(1).default(1),
    animation: GlyphAnimationEnvelopeSchema.optional(),
});

export const GlyphPulseSchema = z
    .object({
        distanceFromCenterMinFactor: z.number(),
        distanceFromCenterMaxFactor: z.number(),
        scalePulseMin: z.number(),
        scalePulseMax: z.number(),
        rotationDeltaMinDeg: z.number(),
        rotationDeltaMaxDeg: z.number(),
        delayMsByPosition: z.array(z.number().int().min(0).max(180)).length(9),
    })
    .superRefine(refineAnimationEnvelope);

export const GlyphPresetSchema = z
    .object({
        placements: z.array(GlyphPlacementSchema).min(1).max(MAX_GLYPH_SLOTS),
        pulse: GlyphPulseSchema,
    })
    .superRefine((value, ctx) => {
        const seen = new Set<number>();
        value.placements.forEach((placement, index) => {
            if (seen.has(placement.position)) {
                ctx.addIssue({
                    code: "custom",
                    message: "duplicate position",
                    path: ["placements", index, "position"],
                });
            }
            seen.add(placement.position);
        });
    });

export type GlyphPreset = z.infer<typeof GlyphPresetSchema>;
