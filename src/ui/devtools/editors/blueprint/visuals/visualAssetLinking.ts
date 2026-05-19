import type { ModuleCartridge } from "../../../../../data/schemas/module";

const readAssetFolder = (filename: string) => {
    const normalized = filename.replaceAll("\\", "/").replace(/^\/+/, "");
    const modulesIndex = normalized.indexOf("/modules/");
    if (modulesIndex >= 0) return normalized.slice(0, modulesIndex + 9);
    if (normalized.startsWith("modules/")) return "modules/";
    const slash = normalized.indexOf("/");
    return slash >= 0 ? normalized.slice(0, slash + 1) : "";
};

export const resolveVisualAssetFilename = (filename: string) =>
    `${readAssetFolder(filename)}assets.art`;

export const mergeVisualDrafts = (
    blueprintDraft: ModuleCartridge | null,
    assetDraft: ModuleCartridge | null,
) => {
    if (!blueprintDraft) return null;
    if (!assetDraft) return blueprintDraft;
    return { ...blueprintDraft, assets: assetDraft.assets };
};
