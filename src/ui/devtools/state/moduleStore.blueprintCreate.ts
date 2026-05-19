import type { ModuleCartridge } from "../../../data/schemas/module";
import type { Blueprint } from "../../../data/schemas/blueprint";
import { buildModuleIndex } from "./moduleStore.index";
import { suggestUniqueLabelForIndex } from "./moduleStore.labels";
import { DEFAULT_BLUEPRINT_TAGS } from "./moduleStore.constants";

export function createBlueprintInModule(params: {
    moduleData: ModuleCartridge;
    newId: string;
    baseLabel?: string;
    icon?: string;
}): { updated: ModuleCartridge; blueprintId: string } {
    const { moduleData, newId } = params;
    const blueprints = moduleData.blueprints ?? {};
    const { labelToId } = buildModuleIndex(moduleData);
    const label = suggestUniqueLabelForIndex(
        params.baseLabel ?? "New Entity",
        labelToId,
    );

    const newBlueprint: Blueprint = {
        id: newId,
        label,
        tags: [...DEFAULT_BLUEPRINT_TAGS],
        components: {
            display: { label, display_key: params.icon ?? "unknown" },
        },
    };

    return {
        updated: {
            ...moduleData,
            blueprints: {
                ...blueprints,
                [newId]: newBlueprint,
            },
        },
        blueprintId: newId,
    };
}
