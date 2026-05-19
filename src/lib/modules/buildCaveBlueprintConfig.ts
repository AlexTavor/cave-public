import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_CARRIER_SETTINGS } from "../../data/schemas/game/carrier";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { asRecord } from "./semanticModuleFragmentUtils";

export const buildCaveBlueprintConfig = (raw: unknown) => {
    const input = asRecord(raw);
    return {
        traits: asRecord(input.traits),
        habiti: asRecord(input.habiti),
        understanding: asRecord(input.understanding),
        settings: {
            impulse: {
                ...DEFAULT_IMPULSE_CONFIG,
                ...asRecord(input.impulse),
            },
            game_config: {
                ...DEFAULT_GAME_CONFIG,
                ...asRecord(input.game_config),
            },
            conditions: Array.isArray(input.conditions) ? input.conditions : [],
            guidances: Array.isArray(input.guidances) ? input.guidances : [],
            tutorials: Array.isArray(input.tutorials) ? input.tutorials : [],
            knowledge: Array.isArray(input.knowledge) ? input.knowledge : [],
            body: input.body,
            carrier: {
                ...DEFAULT_CARRIER_SETTINGS,
                ...asRecord(input.carrier),
            },
            world: input.world,
        },
    };
};
