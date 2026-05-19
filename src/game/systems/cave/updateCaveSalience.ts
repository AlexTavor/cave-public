import type { CaveMindMemory } from "../../../data/schemas/game/caveMind";
import { CAVE_MIND_CONFIG } from "./CaveMindConfig";
import type { CaveStimuli, RankedSalience } from "./caveMindTypes";
import {
    resolveBaseScore,
    resolveDominantStimulus,
} from "./updateCaveSalienceScore";

export const updateCaveSalience = (
    stimuli: CaveStimuli,
    memory: CaveMindMemory,
): { entities: CaveMindMemory["entities"]; ranked: RankedSalience[] } => {
    const next: CaveMindMemory["entities"] = {};
    const ranked = stimuli.candidates.map((stimulus) => {
        const previous = memory.entities[stimulus.entityId];
        const ratio =
            stimulus.cycleMax > 0 ? stimulus.cycleValue / stimulus.cycleMax : 0;
        const moveDistance = previous
            ? Math.hypot(
                  stimulus.worldX - previous.previousWorldX,
                  stimulus.worldY - previous.previousWorldY,
              )
            : 0;
        const score = resolveBaseScore(stimulus, previous, ratio, moveDistance);
        next[stimulus.entityId] = {
            previousWorldX: stimulus.worldX,
            previousWorldY: stimulus.worldY,
            previousSalience: score,
            previousCycleValue: stimulus.cycleValue,
            previousCycleMax: stimulus.cycleMax,
            previousAbsorptionProgress: stimulus.absorptionProgress,
            previousAbsorptionMax: stimulus.absorptionMax,
            previousAssignedCount: stimulus.assignedCount,
            previousSelected: stimulus.selected,
            previousDragged: stimulus.dragged,
            previousCycleActive: stimulus.cycleActive,
            seenActiveCycle: Boolean(
                previous?.seenActiveCycle || stimulus.cycleActive,
            ),
            previousTraitIds: stimulus.traitIds,
        };
        return {
            entityId: stimulus.entityId,
            score,
            dominantStimulus: resolveDominantStimulus(
                stimulus.dragged,
                ratio >= CAVE_MIND_CONFIG.salience.nearCompleteThreshold,
                stimulus.selected,
            ),
            worldX: stimulus.worldX,
            worldY: stimulus.worldY,
            dragged: stimulus.dragged,
            nearComplete:
                ratio >= CAVE_MIND_CONFIG.salience.nearCompleteThreshold,
            cycleMax: stimulus.cycleMax,
        };
    });
    ranked.sort(
        (left, right) =>
            right.score - left.score || right.cycleMax - left.cycleMax,
    );
    return { entities: next, ranked };
};
