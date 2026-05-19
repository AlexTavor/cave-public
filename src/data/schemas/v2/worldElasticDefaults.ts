import { createDefaultWorldState } from "./caveWorldDefaults";

export const WORLD_AUTO_REQUEST_DEFAULTS = {
    food: {
        baseDemandPerSecond: 0,
        bodyDemandPerBodyPerSecond: 1,
        windowSeconds: 100,
        minCapacity: 100,
    },
    heat: {
        baseDemandPerSecond: 0,
        bodyDemandPerBodyPerSecond: 1,
        windowSeconds: 100,
        minCapacity: 100,
    },
};

export const createElasticWorldState = () => {
    const state = createDefaultWorldState();
    const food = state.food as Record<string, unknown>;
    const heat = state.heat as Record<string, unknown>;
    food.value = WORLD_AUTO_REQUEST_DEFAULTS.food.minCapacity;
    food.max = WORLD_AUTO_REQUEST_DEFAULTS.food.minCapacity;
    food.preserveValueOnMaxDecrease = true;
    heat.value = WORLD_AUTO_REQUEST_DEFAULTS.heat.minCapacity;
    heat.max = WORLD_AUTO_REQUEST_DEFAULTS.heat.minCapacity;
    heat.preserveValueOnMaxDecrease = true;
    return state;
};
