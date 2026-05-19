import type { ModuleDisplayAsset } from "../../../state/moduleStore.assets";

type RenameError = "empty" | "duplicate" | "missing_current";

export const createDefaultDisplayAsset = (
    type: ModuleDisplayAsset["type"],
): ModuleDisplayAsset => {
    if (type === "body") return { type };
    if (type === "attribute_pool") return { type, attribute: "body" };
    return { type, styleId: "", glyphKey: "" };
};

export const retypeDisplayAsset = (
    asset: ModuleDisplayAsset,
    nextType: ModuleDisplayAsset["type"],
): ModuleDisplayAsset => {
    if (nextType === asset.type) return asset;
    if (nextType === "body")
        return { type: nextType, tooltip: asset.tooltip, tags: asset.tags };
    if (nextType === "attribute_pool") {
        return {
            type: nextType,
            attribute: "body",
            tooltip: asset.tooltip,
            tags: asset.tags,
        };
    }
    return {
        type: nextType,
        styleId: "",
        glyphKey: "",
        tooltip: asset.tooltip,
        tags: asset.tags,
    };
};

export const parseDisplayTags = (input: string): string[] =>
    input
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

export const formatDisplayTags = (tags?: string[]): string =>
    (tags ?? []).join(", ");

export const validateDisplayRename = (
    displays: Record<string, ModuleDisplayAsset>,
    currentId: string,
    nextId: string,
): RenameError | null => {
    const trimmed = nextId.trim();
    if (!trimmed) return "empty";
    if (!displays[currentId]) return "missing_current";
    if (trimmed !== currentId && displays[trimmed]) return "duplicate";
    return null;
};

export const getDisplayDefinitionSummary = (
    asset: ModuleDisplayAsset,
): string => {
    if (asset.type === "body") return "body";
    if (asset.type === "attribute_pool")
        return `attribute_pool · ${asset.attribute}`;
    return `resource · ${asset.styleId || "unset"} / ${asset.glyphKey || "unset"}`;
};

export const getDisplayMetadataSummary = (
    asset: ModuleDisplayAsset,
): string => {
    const firstTooltipLine = asset.tooltip
        ?.split("\n")
        .map((line) => line.trim())
        .find(Boolean);
    if (firstTooltipLine) return firstTooltipLine;
    if ((asset.tags?.length ?? 0) > 0)
        return `tags: ${(asset.tags ?? []).join(", ")}`;
    return "No metadata";
};
