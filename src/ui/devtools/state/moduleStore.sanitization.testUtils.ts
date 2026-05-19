import type { ModuleCartridge } from "../../../data/schemas/module";
import type { ModuleStoreIO } from "./moduleStore.io";
import { createCartridge } from "../../../engine/test/factories";

export const makeModule = (blueprints: ModuleCartridge["blueprints"]) =>
    createCartridge("game_data.json", { blueprints });

export const createMemoryIO = (
    disk: Record<string, ModuleCartridge>,
): ModuleStoreIO => ({
    readModule: async (filename) => disk[filename] ?? null,
    saveModule: async (filename, moduleData) => {
        disk[filename] = moduleData;
        return moduleData;
    },
});

export const makeStorageAbility = (resource: string, capacity: number) => ({
    resource,
    capacity: { base: capacity, perBody: 0, multPerBody: 0 },
    isDefault: true,
    entropy: { base: 0, perBody: 0, multPerBody: 0 },
    visible: true,
    allowDeposit: true,
    allowWithdraw: true,
    priority: 0,
});

export const makeUpkeepAbility = (resource: string, rate: number) => ({
    resource,
    rate: { base: rate, perBody: 0, multPerBody: 0 },
    failureTrait: "is_starving",
    autoRequest: true,
});

