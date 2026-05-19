import type { ModuleCartridge } from "../../../data/schemas/module";
import type {
    DraftOptionBlueprint,
    DraftPoolBlueprint,
} from "../../../data/schemas/draft";
import { generateDraftOptionId, generateDraftPoolId } from "./moduleStore.ids";

const DEFAULT_OPTION_TITLE = "New Draft Option";

const makeDraftOption = (id: string): DraftOptionBlueprint => ({
    id,
    title: DEFAULT_OPTION_TITLE,
    description: "",
    rarity: "none",
    icon: "unknown",
    payload: [],
});

const makeDraftPool = (id: string): DraftPoolBlueprint => ({
    id,
    entries: [],
    texts: [],
});

export function createDraftOptionInModule(params: {
    moduleData: ModuleCartridge;
}): { updated: ModuleCartridge; optionId: string } {
    const optionId = generateDraftOptionId();
    const options = params.moduleData.draftOptions ?? {};

    const updated: ModuleCartridge = {
        ...params.moduleData,
        draftOptions: {
            ...options,
            [optionId]: makeDraftOption(optionId),
        },
    };

    return { updated, optionId };
}

export function createDraftPoolInModule(params: {
    moduleData: ModuleCartridge;
}): { updated: ModuleCartridge; poolId: string } {
    const poolId = generateDraftPoolId();
    const pools = params.moduleData.draftPools ?? {};

    const updated: ModuleCartridge = {
        ...params.moduleData,
        draftPools: {
            ...pools,
            [poolId]: makeDraftPool(poolId),
        },
    };

    return { updated, poolId };
}

export function deleteDraftOptionFromModule(params: {
    moduleData: ModuleCartridge;
    optionId: string;
}): ModuleCartridge {
    const options = params.moduleData.draftOptions ?? {};
    if (!options[params.optionId]) return params.moduleData;

    const next = { ...options } as Record<string, DraftOptionBlueprint>;
    delete next[params.optionId];

    return {
        ...params.moduleData,
        draftOptions: next,
    };
}

export function deleteDraftPoolFromModule(params: {
    moduleData: ModuleCartridge;
    poolId: string;
}): ModuleCartridge {
    const pools = params.moduleData.draftPools ?? {};
    if (!pools[params.poolId]) return params.moduleData;

    const next = { ...pools } as Record<string, DraftPoolBlueprint>;
    delete next[params.poolId];

    return {
        ...params.moduleData,
        draftPools: next,
    };
}

