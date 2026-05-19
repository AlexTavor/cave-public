import type { ModuleDisplayAsset } from "../../../../state/moduleStore.assets";

export const mergeDisplayAssets = (
    moduleDisplays: Record<string, ModuleDisplayAsset> | null | undefined,
    sessionDisplays: Record<string, ModuleDisplayAsset> | null | undefined,
) => {
    const merged = moduleDisplays ? { ...moduleDisplays } : {};
    return sessionDisplays ? { ...merged, ...sessionDisplays } : merged;
};
