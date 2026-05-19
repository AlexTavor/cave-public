import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type { TraitDefinition } from "../../../../../data/schemas/game/traits";
import type { TraitInstance } from "../../../../../data/schemas/components";
import type { EntityAnalysisResult } from "./entityAnalysis.types";
import {
    extractUpkeepModifiers,
    extractPowerModifiers,
    extractCaveAttributeModifiers,
} from "./extractModifiers";
import { extractTraits } from "./extractTraits";

export const analyzeEntityState = (
    entity: RuntimeEntity,
    traitIndex: Record<string, TraitDefinition>,
): EntityAnalysisResult => {
    const traits = (entity.traits ?? []) as TraitInstance[];
    return {
        modifiers: [
            ...extractUpkeepModifiers(entity),
            ...extractPowerModifiers(entity),
            ...extractCaveAttributeModifiers(entity),
        ],
        traits: extractTraits(traits, traitIndex),
    };
};
