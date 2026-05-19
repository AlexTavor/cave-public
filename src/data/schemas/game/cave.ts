import { z } from "zod";
import { AttributeSetSchema } from "./body";
import { CaveMindSchema, createDefaultCaveMind } from "./caveMind";

export const ProgressionSchema = z.object({
    xp: z.number().default(0),
    level: z.number().int().min(1).default(1),
    skillpoints: z.number().default(0),
});

export const PurgeStateSchema = z.object({
    isActive: z.boolean().default(false),
    nextKillTimer: z.number().default(0),
});

export const CaveComponentSchema = z.object({
    attributes: AttributeSetSchema.default({
        body: 10,
        mind: 10,
        social: 10,
    }),
    ownedHabiti: z.array(z.string()).default([]),
    ownedUnderstanding: z.array(z.string()).default([]),
    absorptionXpConversionBonus: z.number().default(0),
    progression: ProgressionSchema.default({ xp: 0, level: 1, skillpoints: 0 }),
    purge: PurgeStateSchema.default({ isActive: false, nextKillTimer: 0 }),
    mind: CaveMindSchema.default(createDefaultCaveMind()),
});

export type CaveProgression = z.infer<typeof ProgressionSchema>;
export type PurgeState = z.infer<typeof PurgeStateSchema>;
export type CaveComponent = z.infer<typeof CaveComponentSchema>;

