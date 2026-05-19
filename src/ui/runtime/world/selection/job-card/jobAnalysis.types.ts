import type { AbilityEffectGroup } from "../ability-display/abilityDisplay.types";

export interface JobAnalysisResult {
    cycleCurrent: number | null;
    cycleMax: number | null;
    ticksRemaining: number | null;
    nextCycleGroups: AbilityEffectGroup[];
}

