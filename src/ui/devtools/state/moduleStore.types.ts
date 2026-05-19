import type { StoreApi, UseBoundStore } from "zustand";
import type {
    ModuleCartridge,
    ModuleMetadata,
} from "../../../data/schemas/module";
import type {
    BlueprintHeader,
    BlueprintId,
} from "../../../engine/registry/types";
import type { ModuleIndex as ModuleIndexType } from "./moduleStore.index";
import type { AssetCategory, ModuleDisplayAsset } from "./moduleStore.assets";
import type { ImpulseConfig } from "../../../data/schemas/physics";
import type { Blueprint } from "../../../data/schemas/blueprint";

export interface DeleteImpact {
    fromId: BlueprintId;
    fromLabel: string;
    path: string;
}

export interface ModuleStoreState {
    modules: Record<string, ModuleCartridge>;
    indexes: Record<string, ModuleIndexType>;
    loading: Record<string, boolean>;
    loadOrder: string[];

    loadModule: (filename: string) => Promise<void>;

    getModule: (filename: string) => ModuleCartridge | null;
    getHeaders: (filename: string) => Record<string, BlueprintHeader>;
    getLabel: (filename: string, blueprintId: string) => string;

    validateUniqueLabel: (params: {
        filename: string;
        label: string;
        currentId?: string;
    }) => { ok: boolean; existingId?: string };

    suggestUniqueLabel: (params: {
        filename: string;
        baseLabel: string;
    }) => string;

    createBlueprint: (params: { filename: string }) => Promise<string>;
    duplicateBlueprint: (params: {
        filename: string;
        blueprintId: string;
    }) => Promise<string>;

    computeDeleteImpact: (params: {
        filename: string;
        blueprintId: string;
    }) => DeleteImpact[];

    deleteBlueprint: (params: {
        filename: string;
        blueprintId: string;
    }) => Promise<void>;

    saveBlueprint: (params: {
        filename: string;
        blueprintId: string;
        blueprint: Blueprint;
    }) => Promise<ModuleCartridge>;

    ejectBlueprint: (params: {
        filename: string;
        blueprintId: string;
    }) => Promise<ModuleCartridge>;

    saveModuleMetadata: (params: {
        filename: string;
        metadata: ModuleMetadata;
    }) => Promise<ModuleCartridge>;

    saveModuleCartridge: (params: {
        filename: string;
        module: ModuleCartridge;
    }) => Promise<ModuleCartridge>;

    saveAssetToModule: (params: {
        filename: string;
        category: AssetCategory;
        assetId: string;
        assetData: ModuleDisplayAsset;
    }) => Promise<ModuleCartridge>;

    deleteAssetFromModule: (params: {
        filename: string;
        category: AssetCategory;
        assetId: string;
    }) => Promise<void>;

    applyImpulseConfig: (params: {
        filename: string;
        impulse: ImpulseConfig;
    }) => void;

    saveImpulseConfig: (params: {
        filename: string;
        impulse: ImpulseConfig;
    }) => Promise<ModuleCartridge>;

    createDraftOption: (params: { filename: string }) => Promise<string>;
    createDraftPool: (params: { filename: string }) => Promise<string>;
    deleteDraftOption: (params: {
        filename: string;
        optionId: string;
    }) => Promise<void>;
    deleteDraftPool: (params: {
        filename: string;
        poolId: string;
    }) => Promise<void>;
    updateDraftPoolEntries: (params: {
        filename: string;
        poolId: string;
        entries: import("../../../data/schemas/draft").DraftPoolEntry[];
    }) => Promise<void>;
}

export type ModuleStore = UseBoundStore<StoreApi<ModuleStoreState>>;

