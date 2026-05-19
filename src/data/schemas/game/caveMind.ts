import { z } from "zod";
import { CaveRenderSchema, DEFAULT_CAVE_RENDER } from "./caveMindRender";

const TopIdsSchema = z.array(z.string()).max(3).default([]);
const CuriosityNodeSchema = z.object({
    boredom01: z.number().min(0).max(1).default(0),
});

export const CaveMindMemoryEntitySchema = z.object({
    previousWorldX: z.number().default(0),
    previousWorldY: z.number().default(0),
    previousSalience: z.number().default(0),
    previousCycleValue: z.number().default(0),
    previousCycleMax: z.number().default(0),
    previousAbsorptionProgress: z.number().default(0),
    previousAbsorptionMax: z.number().default(0),
    previousAssignedCount: z.number().int().default(0),
    previousSelected: z.boolean().default(false),
    previousDragged: z.boolean().default(false),
    previousCycleActive: z.boolean().default(false),
    seenActiveCycle: z.boolean().default(false),
    previousTraitIds: z.array(z.string()).default([]),
});

const CaveMindCounterSchema = z.object({
    purgeBegan: z.number().default(0),
    purgeKill: z.number().default(0),
    absorptionComplete: z.number().default(0),
    butchered: z.number().default(0),
});

export const CaveMindSchema = z.object({
    attention: z.object({
        targetEntityId: z.string().default(""),
        targetWorldX: z.number().default(0),
        targetWorldY: z.number().default(0),
        lookMode: z
            .enum(["idle", "track", "inspect", "panic_scan", "lock"])
            .default("idle"),
        dominantStimulus: z.string().default("idle"),
        focusStrength: z.number().min(0).max(1).default(0),
        candidateIds: TopIdsSchema,
    }),
    emotions: z.object({
        happiness: z.number().min(0).max(1).default(0),
        sadness: z.number().min(0).max(1).default(0),
        terror: z.number().min(0).max(1).default(0),
        curiosity: z.number().min(0).max(1).default(0),
        worry: z.number().min(0).max(1).default(0),
    }),
    render: CaveRenderSchema.default(DEFAULT_CAVE_RENDER),
    pulsePresetKey: z.string().default(""),
    memory: z.object({
        previousComfort: z.number().default(1),
        comfortDeclineTicks: z.number().int().min(0).default(0),
        comfortTrendAnchor: z.number().nullable().default(null),
        comfortWindowStartComfort: z.number().nullable().default(null),
        comfortWindowStartElapsedS: z.number().nullable().default(null),
        comfortWindowDelta: z.number().default(0),
        previousXp: z.number().default(0),
        previousLevel: z.number().default(1),
        eyeDriftPhaseX: z.number().default(0),
        eyeDriftPhaseY: z.number().default(Math.PI / 2),
        previousPurgeActive: z.boolean().default(false),
        previousSelectedEntityId: z.string().default(""),
        previousDragEntityId: z.string().default(""),
        previousDragActive: z.boolean().default(false),
        previousEventCounters: CaveMindCounterSchema.default(
            CaveMindCounterSchema.parse({}),
        ),
        curiosityNodes: z.record(z.string(), CuriosityNodeSchema).default({}),
        entities: z.record(z.string(), CaveMindMemoryEntitySchema).default({}),
    }),
});

export type CaveMind = z.infer<typeof CaveMindSchema>;
export type { CaveRender } from "./caveMindRender";
export type CaveMindMemory = CaveMind["memory"];
export type CaveMindMemoryEntity = z.infer<typeof CaveMindMemoryEntitySchema>;

export const createDefaultCaveMind = (): CaveMind =>
    CaveMindSchema.parse({
        attention: {},
        emotions: {},
        render: DEFAULT_CAVE_RENDER,
        memory: {},
    });
