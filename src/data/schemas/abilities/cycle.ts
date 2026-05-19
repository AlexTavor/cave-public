import { z } from "zod";
import { DISPLAY_PALETTE_KEYS } from "../../../lib/displays/displayKeyKinds";
import { RESOURCE_PROGRESS_BAR_POSITIONS } from "../../../lib/displays/resourceProgressBarSlots";
import { ScalableValueSchema } from "./utils";
import { ConditionLinesSchema } from "./conditions";

export const CycleResourceCostSchema = z.object({
    resource: z.string().min(1),
    amount: ScalableValueSchema.optional().default({
        base: 0,
        perBody: 0,
        multPerBody: 0,
    }),
    requestPerSecondAtFullThrottle: z.number().positive().default(10),
    requestCadenceSeconds: z.number().positive().default(1),
    scaleByBodiesOwned: z.boolean().default(false),
    scaleByCyclesCompleted: z.boolean().default(false),
    visible: z.boolean().default(true),
    barPosition: z.enum(RESOURCE_PROGRESS_BAR_POSITIONS).optional(),
    barColorHex: z.string().optional(),
    barPaletteColorKey: z.enum(DISPLAY_PALETTE_KEYS).optional(),
    priority: z.number().default(0),
});

export const CycleAbilitySchema = z.object({
    maxProgress: ScalableValueSchema.default({
        base: 100,
        perBody: 0,
        multPerBody: 0,
    }),
    costMultPerCycle: z.number().min(0).default(0),
    inputs: z
        .object({
            body: ScalableValueSchema.optional(),
            mind: ScalableValueSchema.optional(),
            social: ScalableValueSchema.optional(),
        })
        .default({}),
    transformTo: z.string().min(1).optional(),
    keepProgress: z.boolean().optional(),
    oneOff: z.boolean().default(false),
    showProgressBar: z.boolean().optional(),
    showThrottleSlider: z.boolean().optional(),
    startActive: z.boolean().optional(),
    resourceCosts: z.array(CycleResourceCostSchema).optional().default([]),
    conditions: ConditionLinesSchema.optional().default([]),
});

export type CycleAbilityConfig = z.input<typeof CycleAbilitySchema>;
export type CycleResourceCostConfig = z.input<typeof CycleResourceCostSchema>;

