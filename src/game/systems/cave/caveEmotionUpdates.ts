import type { CaveMindMemory } from "../../../data/schemas/game/caveMind";
import { CAVE_MIND_CONFIG } from "./CaveMindConfig";
import type { CaveStimuli } from "./caveMindTypes";

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const addGain = (
    gains: Record<string, number>,
    entityId: string,
    gain: number,
) => {
    gains[entityId] = (gains[entityId] ?? 0) + gain;
};

const resolveComfortWindow = (
    comfort: number,
    elapsedRealSeconds: number,
    memory: CaveMindMemory,
) => {
    let startComfort = memory.comfortWindowStartComfort;
    let startElapsedS = memory.comfortWindowStartElapsedS;
    startComfort ??= memory.previousComfort;
    startElapsedS ??= elapsedRealSeconds;
    if (
        elapsedRealSeconds - startElapsedS <
        CAVE_MIND_CONFIG.emotions.worry.sampleWindowSeconds
    )
        return {
            advanced: false,
            delta: memory.comfortWindowDelta,
            startComfort,
            startElapsedS,
        };
    return {
        advanced: true,
        delta: comfort - startComfort,
        startComfort: comfort,
        startElapsedS: elapsedRealSeconds,
    };
};

export const resolveWorryUpdate = (
    previousWorry: number,
    comfort: number,
    elapsedRealSeconds: number,
    memory: CaveMindMemory,
) => {
    const comfortDelta = comfort - memory.previousComfort;
    const sample = resolveComfortWindow(comfort, elapsedRealSeconds, memory);
    const fallMagnitude01 = clamp01(-sample.delta);
    const riseMagnitude01 = clamp01(comfortDelta);
    const threshold = CAVE_MIND_CONFIG.emotions.worry.trendEpsilon;
    const isMeaningfulFall = fallMagnitude01 - threshold > Number.EPSILON;
    const isMeaningfulRise = riseMagnitude01 - threshold > Number.EPSILON;
    let comfortDeclineTicks = isMeaningfulRise ? 0 : memory.comfortDeclineTicks;
    if (sample.advanced && isMeaningfulFall) comfortDeclineTicks += 1;
    let worry = previousWorry * CAVE_MIND_CONFIG.emotions.decay;
    if (isMeaningfulFall) {
        const fillScale =
            1 /
            (1 +
                fallMagnitude01 *
                    CAVE_MIND_CONFIG.emotions.worry.quickDeclinePenalty +
                Math.max(0, comfortDeclineTicks - 1) *
                    CAVE_MIND_CONFIG.emotions.worry
                        .prolongedDeclinePenaltyPerTick);
        worry += CAVE_MIND_CONFIG.emotions.worry.fillPerDeclineTick * fillScale;
    }
    if (isMeaningfulRise)
        worry -=
            riseMagnitude01 *
            CAVE_MIND_CONFIG.emotions.worry.recoveryPerComfortRise;
    if (!isMeaningfulFall) {
        const reliefFloor = CAVE_MIND_CONFIG.emotions.worry.comfortReliefFloor;
        const comfortRelief01 = clamp01(
            (comfort - reliefFloor) / (1 - reliefFloor),
        );
        worry -=
            comfortRelief01 *
            CAVE_MIND_CONFIG.emotions.worry.comfortReliefPerTick;
    }
    return {
        worry: clamp01(worry),
        comfortDeclineTicks,
        comfortWindowStartComfort: sample.startComfort,
        comfortWindowStartElapsedS: sample.startElapsedS,
        comfortWindowDelta: sample.delta,
    };
};

export const resolveCuriosityNodeUpdate = (
    previousCuriosity: number,
    world: CaveStimuli["world"],
    memory: CaveMindMemory,
) => {
    const gains: Record<string, number> = {};
    world.explorationCuriosityEntityIds.forEach((entityId) => {
        addGain(gains, entityId, CAVE_MIND_CONFIG.emotions.baselines.curiosity);
    });
    world.assignedNodeCuriosityEntityIds.forEach((entityId) => {
        addGain(gains, entityId, 0.02);
    });
    world.firstCycleCuriosityEntityIds.forEach((entityId) => {
        addGain(gains, entityId, CAVE_MIND_CONFIG.emotions.impulses.firstCycle);
    });
    let curiosity = previousCuriosity;
    const curiosityNodes: CaveMindMemory["curiosityNodes"] = {};
    const entityIds = new Set([
        ...Object.keys(memory.curiosityNodes),
        ...Object.keys(gains),
    ]);
    entityIds.forEach((entityId) => {
        const previousBoredom01 =
            memory.curiosityNodes[entityId]?.boredom01 ?? 0;
        const tickBaseGain = gains[entityId] ?? 0;
        const nextBoredom01 = clamp01(
            previousBoredom01 +
                (tickBaseGain > 0
                    ? CAVE_MIND_CONFIG.emotions.curiosityBoredom
                          .gainPerContributingTick
                    : -CAVE_MIND_CONFIG.emotions.curiosityBoredom
                          .recoveryPerTick),
        );
        if (tickBaseGain > 0)
            curiosity += tickBaseGain * (1 - previousBoredom01);
        if (nextBoredom01 > 0)
            curiosityNodes[entityId] = { boredom01: nextBoredom01 };
    });
    return { curiosity: clamp01(curiosity), curiosityNodes };
};
