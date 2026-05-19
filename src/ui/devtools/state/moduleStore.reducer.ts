import type { ModuleCartridge } from "../../../data/schemas/module";
import type { ModuleIndex } from "./moduleStore.index";
import { buildModuleIndex } from "./moduleStore.index";

export interface ModuleStoreSlices {
    modules: Record<string, ModuleCartridge>;
    indexes: Record<string, ModuleIndex>;
}
export function upsertModuleInState<T extends ModuleStoreSlices>(
    prev: T,
    filename: string,
    moduleData: ModuleCartridge
): T {
    return {
        ...prev,
        modules: { ...prev.modules, [filename]: moduleData },
        indexes: { ...prev.indexes, [filename]: buildModuleIndex(moduleData) },
    };
}
