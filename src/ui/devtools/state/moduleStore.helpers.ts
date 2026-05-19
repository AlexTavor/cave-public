import type { ModuleCartridge } from "../../../data/schemas/module";
import type { ModuleStoreIO } from "./moduleStore.io";
import { upsertModuleInState, ModuleStoreSlices } from "./moduleStore.reducer";
import { ensureModuleAssets } from "./moduleStore.assets";
import { ensureModuleBlueprint } from "./moduleStore.blueprint";

export function bumpLoadOrder(prev: string[], filename: string): string[] {
    const without = prev.filter((f) => f !== filename);
    return [...without, filename];
}

export async function mutateModule<T extends ModuleStoreSlices>(
    get: () => T,
    set: (fn: (state: T) => Partial<T>) => void,
    io: ModuleStoreIO,
    filename: string,
    operation: (
        normalized: ModuleCartridge,
    ) => ModuleCartridge | Promise<ModuleCartridge>,
): Promise<ModuleCartridge> {
    const currentModules = get().modules;
    let mod = currentModules[filename];

    // If not in state, try to read it
    if (!mod) {
        const createResult = await io.readModule(filename);
        if (createResult) mod = createResult;
    }

    if (!mod) {
        throw new Error(`Module '${filename}' not found`);
    }

    const normalized = ensureModuleBlueprint(ensureModuleAssets(mod));

    // Run the operation
    const result = await operation(normalized);

    // Save
    const saved = await io.saveModule(filename, result);

    // Update State
    set((s) => upsertModuleInState(s, filename, saved));

    return saved;
}
