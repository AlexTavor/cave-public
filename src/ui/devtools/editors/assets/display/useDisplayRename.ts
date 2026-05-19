import { useCallback } from "react";
import type { ModuleDisplayAsset } from "../../../state/moduleStore.assets";
import { renameErrorMessage } from "./displayEditorShared";
import { validateDisplayRename } from "./displayEditorHelpers";

export const useDisplayRename = (params: {
    assetId: string;
    displays: Record<string, ModuleDisplayAsset>;
    filename: string;
    openFile(path: string): void;
    pushToast(level: "error", message: string): void;
    updateDraft(filename: string, recipe: (draft: any) => void): void;
}) => {
    const { assetId, displays, filename, openFile, pushToast, updateDraft } =
        params;
    return useCallback(
        (nextId: string): string | null => {
            const trimmed = nextId.trim();
            const error = validateDisplayRename(displays, assetId, trimmed);
            if (error) {
                pushToast("error", renameErrorMessage(error, assetId, trimmed));
                return error;
            }
            if (trimmed === assetId) return null;
            updateDraft(filename, (moduleDraft) => {
                const current = moduleDraft.assets.displays[assetId];
                delete moduleDraft.assets.displays[assetId];
                moduleDraft.assets.displays[trimmed] = current;
            });
            openFile(`${filename}::assets::displays::${trimmed}`);
            return null;
        },
        [assetId, displays, filename, openFile, pushToast, updateDraft],
    );
};
