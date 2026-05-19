import { createDefaultModuleStoreIO } from "./moduleStore.io";
import { createModuleStore } from "./moduleStore.create";
import type { ModuleStore } from "./moduleStore.types";

export type { DeleteImpact, ModuleStoreState } from "./moduleStore.types";
export { createModuleStore } from "./moduleStore.create";

export const useModuleStore: ModuleStore = createModuleStore(
    createDefaultModuleStoreIO(),
);
