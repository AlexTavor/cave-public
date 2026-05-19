import type {
    CaveMind,
    CaveMindMemory,
} from "../../../data/schemas/game/caveMind";

export type CaveStimulus = {
    entityId: string;
    worldX: number;
    worldY: number;
    tags: string[];
    assignedCount: number;
    assignmentAttentionEligible: boolean;
    absorptionProgress: number;
    absorptionMax: number;
    cycleValue: number;
    cycleMax: number;
    cycleActive: boolean;
    selected: boolean;
    dragged: boolean;
    explorationTagged: boolean;
    traitIds: string[];
};

export type CaveWorldSignals = {
    comfort: number;
    elapsedRealSeconds: number;
    xp: number;
    level: number;
    purgeActive: boolean;
    selectedEntityId: string;
    dragEntityId: string;
    dragActive: boolean;
    caveWorldX: number;
    caveWorldY: number;
    starvingBodies: number;
    coldBodies: number;
    explorationCuriosityEntityIds: string[];
    assignedNodeCuriosityEntityIds: string[];
    firstCycleCuriosityEntityIds: string[];
    eventCounters: CaveMindMemory["previousEventCounters"];
};

export type CaveStimuli = {
    world: CaveWorldSignals;
    candidates: CaveStimulus[];
};

export type RankedSalience = {
    entityId: string;
    score: number;
    dominantStimulus: string;
    worldX: number;
    worldY: number;
    dragged: boolean;
    nearComplete: boolean;
    cycleMax: number;
};

export type CaveAttention = CaveMind["attention"];
export type CaveEmotions = CaveMind["emotions"];
export type CaveRender = CaveMind["render"];

export type CaveMindStep = {
    attention: CaveAttention;
    emotions: CaveEmotions;
    render: CaveRender;
    pulsePresetKey: string;
    memory: CaveMindMemory;
};
