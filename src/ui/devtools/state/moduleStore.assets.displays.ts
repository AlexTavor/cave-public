import type { ModuleCartridge } from "../../../data/schemas/module";
import type { IconDefinition } from "../../lib/foundation/icon-registry/types";
import { ensureModuleAssets } from "./moduleStore.assets.normalize";
import type { ModuleDisplayAsset } from "./moduleStore.assets.types";

export const saveDisplayAssetToModule = (params: {
    moduleData: ModuleCartridge;
    assetId: string;
    asset: ModuleDisplayAsset;
}): ModuleCartridge => {
    const moduleData = ensureModuleAssets(params.moduleData);
    const displays = (moduleData as any).assets.displays ?? {};
    return {
        ...moduleData,
        assets: {
            ...(moduleData as any).assets,
            displays: { ...displays, [params.assetId]: params.asset },
        },
    } as ModuleCartridge;
};

export const deleteDisplayAssetFromModule = (params: {
    moduleData: ModuleCartridge;
    assetId: string;
}): ModuleCartridge => {
    const moduleData = ensureModuleAssets(params.moduleData);
    const displays = {
        ...(((moduleData as any).assets?.displays ?? {}) as Record<string, ModuleDisplayAsset>),
    };
    if (!displays[params.assetId]) return moduleData;
    delete displays[params.assetId];
    return {
        ...moduleData,
        assets: { ...(moduleData as any).assets, displays },
    } as ModuleCartridge;
};

export const moduleDisplayAssetsToIconRegistry = (
    moduleData: ModuleCartridge,
): Record<string, IconDefinition> => {
    const displays = ((moduleData as any).assets?.displays ?? {}) as Record<string, ModuleDisplayAsset>;
    const out: Record<string, IconDefinition> = {};
    Object.keys(displays).forEach((id) => {
        out[id] = { type: "image", value: id };
    });
    return out;
};