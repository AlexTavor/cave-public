import { create } from "zustand";
import type { ModuleStore, ModuleStoreState } from "./moduleStore.types";
import type { ModuleStoreIO } from "./moduleStore.io";
import { createCoreActions } from "./moduleStore.actions.core";
import { createBlueprintActions } from "./moduleStore.actions.blueprints";
import { createModuleActions } from "./moduleStore.actions.module";
import { createAssetActions } from "./moduleStore.actions.assets";
import { createImpulseActions } from "./moduleStore.actions.impulse";
import { createDraftActions } from "./moduleStore.actions.drafts";
import { createEjectActions } from "./moduleStore.actions.eject";

export function createModuleStore(io: ModuleStoreIO): ModuleStore {
    return create<ModuleStoreState>((set, get) => ({
        modules: {},
        indexes: {},
        loading: {},
        loadOrder: [],
        ...createCoreActions({ set, get, io }),
        ...createBlueprintActions({ set, get, io }),
        ...createModuleActions({ set, get, io }),
        ...createAssetActions({ set, get, io }),
        ...createImpulseActions({ set, get, io }),
        ...createDraftActions({ set, get, io }),
        ...createEjectActions({ set, get, io }),
    }));
}
