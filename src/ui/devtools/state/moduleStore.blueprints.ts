import type {
    ModuleCartridge,
    ModuleMetadata,
} from "../../../data/schemas/module";
import type { Blueprint } from "../../../data/schemas/blueprint";
import { buildModuleIndex } from "./moduleStore.index";
import { suggestUniqueLabelForIndex } from "./moduleStore.labels";
export { createBlueprintInModule } from "./moduleStore.blueprintCreate";

export function getBlueprintBaseLabel(
    source: unknown,
    fallback: string,
): string {
    if (source && typeof source === "object") {
        const src = source as any;
        const direct = src.label;
        if (typeof direct === "string" && direct.trim()) return direct;

        const display = src.components?.display?.label;
        if (typeof display === "string" && display.trim()) return display;
    }

    return fallback;
}

export function duplicateBlueprintInModule(params: {
    moduleData: ModuleCartridge;
    sourceId: string;
    newId: string;
    cloner?: <T>(value: T) => T;
}): { updated: ModuleCartridge; blueprintId: string } {
    const { moduleData, sourceId, newId } = params;
    const source = moduleData.blueprints?.[sourceId] as Blueprint | undefined;
    if (!source) throw new Error("Blueprint not found");

    const blueprints = moduleData.blueprints ?? {};

    const { labelToId } = buildModuleIndex(moduleData);
    const baseLabel = getBlueprintBaseLabel(source, sourceId);
    const nextLabel = suggestUniqueLabelForIndex(String(baseLabel), labelToId);

    const cloner = params.cloner ?? globalThis.structuredClone;
    const cloned = cloner ? cloner(source) : source;

    cloned.id = newId;
    cloned.label = nextLabel;
    if (cloned.components?.display?.label) {
        cloned.components.display.label = nextLabel;
    }

    const updated: ModuleCartridge = {
        ...moduleData,
        blueprints: {
            ...blueprints,
            [newId]: cloned,
        },
    };

    return { updated, blueprintId: newId };
}

export function deleteBlueprintFromModule(params: {
    moduleData: ModuleCartridge;
    blueprintId: string;
}): ModuleCartridge {
    const blueprints = params.moduleData.blueprints ?? {};
    if (!blueprints[params.blueprintId]) return params.moduleData;

    const nextBlueprints = { ...blueprints } as any;
    delete nextBlueprints[params.blueprintId];

    return {
        ...params.moduleData,
        blueprints: nextBlueprints,
    };
}

export function saveBlueprintToModule(params: {
    moduleData: ModuleCartridge;
    blueprintId: string;
    blueprint: unknown;
}): ModuleCartridge {
    const blueprints = params.moduleData.blueprints ?? {};

    return {
        ...params.moduleData,
        blueprints: {
            ...blueprints,
            [params.blueprintId]: params.blueprint as any,
        },
    };
}

export function saveModuleMetadataToModule(params: {
    moduleData: ModuleCartridge;
    metadata: unknown;
}): ModuleCartridge {
    return {
        ...params.moduleData,
        metadata: params.metadata as ModuleMetadata,
    };
}

