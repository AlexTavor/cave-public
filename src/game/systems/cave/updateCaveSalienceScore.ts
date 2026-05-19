import type { CaveMindMemory } from "../../../data/schemas/game/caveMind";
import { CAVE_MIND_CONFIG } from "./CaveMindConfig";
import type { CaveStimuli } from "./caveMindTypes";

const clamp = (value: number) => Math.max(0, value);

export const resolveDominantStimulus = (
    dragged: boolean,
    nearComplete: boolean,
    selected: boolean,
) => {
    if (dragged) return "dragged";
    if (nearComplete) return "cycle";
    if (selected) return "selected";
    return "motion";
};

const resolveMultiplier = (stimulus: CaveStimuli["candidates"][number]) => {
    let multiplier = 1;
    if (stimulus.selected)
        multiplier *= CAVE_MIND_CONFIG.salience.multipliers.selected;
    if (stimulus.dragged)
        multiplier *= CAVE_MIND_CONFIG.salience.multipliers.dragged;
    if (stimulus.assignmentAttentionEligible && stimulus.assignedCount > 0)
        multiplier *= CAVE_MIND_CONFIG.salience.multipliers.assignment;
    if (stimulus.explorationTagged)
        multiplier *= CAVE_MIND_CONFIG.salience.multipliers.exploration;
    return multiplier;
};

const resolveDeltaScore = (
    stimulus: CaveStimuli["candidates"][number],
    previous: CaveMindMemory["entities"][string] | undefined,
    moveDistance: number,
) => {
    let score = moveDistance * CAVE_MIND_CONFIG.salience.moveScale;
    if (!previous) score += CAVE_MIND_CONFIG.salience.appear;
    if (stimulus.selected && !previous?.previousSelected)
        score += CAVE_MIND_CONFIG.salience.selectedImpulse;
    if (stimulus.dragged && !previous?.previousDragged)
        score += CAVE_MIND_CONFIG.salience.draggedImpulse;
    if (
        stimulus.assignmentAttentionEligible &&
        stimulus.assignedCount !== (previous?.previousAssignedCount ?? 0)
    ) {
        score += CAVE_MIND_CONFIG.salience.assignmentImpulse;
    }
    if (stimulus.cycleValue !== (previous?.previousCycleValue ?? 0))
        score += CAVE_MIND_CONFIG.salience.cycleImpulse;
    return score;
};

const resolveSustainedScore = (
    stimulus: CaveStimuli["candidates"][number],
    ratio: number,
) => {
    let score = 0;
    if (stimulus.selected) score += CAVE_MIND_CONFIG.salience.selectedBonus;
    if (stimulus.dragged) score += CAVE_MIND_CONFIG.salience.draggedBonus;
    if (stimulus.cycleActive) {
        score += CAVE_MIND_CONFIG.salience.cycleActiveBonus;
    }
    if (stimulus.assignmentAttentionEligible && stimulus.assignedCount > 0) {
        score += CAVE_MIND_CONFIG.salience.assignmentBonus;
    }
    if (ratio >= CAVE_MIND_CONFIG.salience.nearCompleteThreshold)
        score += ratio * CAVE_MIND_CONFIG.salience.nearingBonus;
    score +=
        Math.min(1, stimulus.cycleMax / 300) *
        CAVE_MIND_CONFIG.salience.effortBonus;
    return score;
};

export const resolveBaseScore = (
    stimulus: CaveStimuli["candidates"][number],
    previous: CaveMindMemory["entities"][string] | undefined,
    ratio: number,
    moveDistance: number,
) => {
    const base =
        (previous?.previousSalience ?? 0) * CAVE_MIND_CONFIG.salience.decay;
    return clamp(
        (base +
            resolveDeltaScore(stimulus, previous, moveDistance) +
            resolveSustainedScore(stimulus, ratio)) *
            resolveMultiplier(stimulus),
    );
};
