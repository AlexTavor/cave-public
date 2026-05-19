import type { ModuleStoreIO } from "./moduleStore.io";
import type { ModuleStoreState } from "./moduleStore.types";

export type ModuleStoreActionContext = {
    get: () => ModuleStoreState;
    set: (fn: (state: ModuleStoreState) => Partial<ModuleStoreState>) => void;
    io: ModuleStoreIO;
};
