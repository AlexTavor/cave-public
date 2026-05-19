import type { CaveMindMemory } from "../../../data/schemas/game/caveMind";
import { CAVE_MIND_CONFIG } from "./CaveMindConfig";
import type { CaveEmotions, CaveStimuli } from "./caveMindTypes";
import {
    clamp01,
    resolveCuriosityNodeUpdate,
    resolveWorryUpdate,
} from "./caveEmotionUpdates";

export const updateCaveEmotions = (
    stimuli: CaveStimuli,
    previous: CaveEmotions,
    memory: CaveMindMemory,
): {
    emotions: CaveEmotions;
    memoryPatch: Pick<
        CaveMindMemory,
        | "comfortDeclineTicks"
        | "comfortWindowStartComfort"
        | "comfortWindowStartElapsedS"
        | "comfortWindowDelta"
        | "curiosityNodes"
    >;
} => {
    const next = {
        happiness: previous.happiness * CAVE_MIND_CONFIG.emotions.decay,
        sadness: previous.sadness * CAVE_MIND_CONFIG.emotions.decay,
        terror: previous.terror * CAVE_MIND_CONFIG.emotions.decay,
        curiosity:
            previous.curiosity * CAVE_MIND_CONFIG.emotions.curiosityDecay,
        worry: previous.worry,
    };
    next.happiness +=
        stimuli.world.comfort * CAVE_MIND_CONFIG.emotions.baselines.happiness;
    next.sadness +=
        (1 - stimuli.world.comfort) *
        CAVE_MIND_CONFIG.emotions.baselines.sadness;
    next.terror +=
        (stimuli.world.purgeActive ? 1 : 0) *
        CAVE_MIND_CONFIG.emotions.baselines.terror;
    next.sadness +=
        stimuli.world.starvingBodies * 0.04 + stimuli.world.coldBodies * 0.04;
    if (
        stimuli.world.comfort - memory.previousComfort >=
        CAVE_MIND_CONFIG.emotions.comfortRiseThreshold
    )
        next.happiness += CAVE_MIND_CONFIG.emotions.impulses.comfortRise;
    if (stimuli.world.xp > memory.previousXp)
        next.curiosity += CAVE_MIND_CONFIG.emotions.impulses.xpGain;
    if (stimuli.world.level > memory.previousLevel)
        next.happiness += CAVE_MIND_CONFIG.emotions.impulses.levelGain;
    const prev = memory.previousEventCounters;
    next.happiness +=
        (stimuli.world.eventCounters.absorptionComplete -
            prev.absorptionComplete) *
        CAVE_MIND_CONFIG.emotions.impulses.absorptionComplete;
    next.terror +=
        (stimuli.world.eventCounters.purgeBegan - prev.purgeBegan) *
        CAVE_MIND_CONFIG.emotions.impulses.purgeBeganTerror;
    next.terror +=
        (stimuli.world.eventCounters.purgeKill - prev.purgeKill) *
        CAVE_MIND_CONFIG.emotions.impulses.purgeKill;
    next.sadness +=
        (stimuli.world.eventCounters.butchered - prev.butchered) *
        CAVE_MIND_CONFIG.emotions.impulses.butchered;
    const curiosityUpdate = resolveCuriosityNodeUpdate(
        next.curiosity,
        stimuli.world,
        memory,
    );
    const worryUpdate = resolveWorryUpdate(
        previous.worry,
        stimuli.world.comfort,
        stimuli.world.elapsedRealSeconds,
        memory,
    );
    return {
        emotions: {
            happiness: clamp01(next.happiness),
            sadness: clamp01(next.sadness),
            terror: clamp01(next.terror),
            curiosity: curiosityUpdate.curiosity,
            worry: worryUpdate.worry,
        },
        memoryPatch: {
            comfortDeclineTicks: worryUpdate.comfortDeclineTicks,
            comfortWindowStartComfort: worryUpdate.comfortWindowStartComfort,
            comfortWindowStartElapsedS: worryUpdate.comfortWindowStartElapsedS,
            comfortWindowDelta: worryUpdate.comfortWindowDelta,
            curiosityNodes: curiosityUpdate.curiosityNodes,
        },
    };
};
