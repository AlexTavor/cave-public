import type { ModuleDisplayAsset } from "../../../state/moduleStore.assets";

export const EMPTY_DISPLAY_RECORD: Record<string, unknown> = {};

export const renameErrorMessage = (
    error: "empty" | "duplicate" | "missing_current",
    assetId: string,
    nextId: string,
) => {
    if (error === "empty") return "Display ID cannot be empty.";
    if (error === "duplicate") return `Display ID "${nextId}" already exists.`;
    return `Display "${assetId}" no longer exists.`;
};

export const replaceAsset = (
    draft: ModuleDisplayAsset,
    next: ModuleDisplayAsset,
) => {
    Object.keys(draft).forEach(
        (key) => delete (draft as Record<string, unknown>)[key],
    );
    Object.assign(draft, next);
};
