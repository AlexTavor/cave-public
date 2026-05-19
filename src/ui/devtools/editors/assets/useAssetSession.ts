import { useCallback } from "react";
import { useShellStore } from "../../shell/shell";
import { useTabGuardStore } from "../../state/tabGuardStore";
import { useSessionStore } from "../../state/useSessionStore";
import type {
    AssetCategory,
    ModuleDisplayAsset,
} from "../../state/moduleStore.assets";
import {
    useEnsureModuleSession,
    useModuleSession,
    useAssetSlice,
} from "../../state/moduleSession";
import { useAssetTabGuard } from "./useAssetTabGuard";

interface UseAssetSessionParams {
    filename: string;
    category: AssetCategory;
    assetId: string;
    tabId?: string;
}

interface UseAssetSessionResult {
    isLoading: boolean;
    draft: ModuleDisplayAsset | undefined;
    sessionId: string;
    canUndo: boolean;
    canRedo: boolean;
    isDirty: boolean;
    undo: () => void;
    redo: () => void;
    handleBack: () => void;
    handleSave: () => Promise<void>;
    handleChange: (recipe: (draft: ModuleDisplayAsset) => void) => void;
}

export function useAssetSession({
    filename,
    category,
    assetId,
    tabId,
}: UseAssetSessionParams): UseAssetSessionResult {
    const { openFile, log } = useShellStore();
    const upsertGuard = useTabGuardStore((s) => s.upsertGuard);
    const removeGuard = useTabGuardStore((s) => s.removeGuard);

    useEnsureModuleSession(filename);
    const moduleSession = useModuleSession(filename);
    const { isReady, isDirty, canUndo, canRedo, undo, redo, save, discard } =
        moduleSession;
    const assetDraft = useAssetSlice<ModuleDisplayAsset>(
        filename,
        category,
        assetId,
    );
    const updateDraft = useSessionStore((s) => s.updateDraft);

    const handleChange = useCallback(
        (recipe: (draft: ModuleDisplayAsset) => void) => {
            updateDraft(filename, (moduleDraft) => {
                const assets = moduleDraft.assets?.[category];
                if (!assets) return;
                const current = assets[assetId] as
                    | ModuleDisplayAsset
                    | undefined;
                if (!current) return;
                recipe(current);
            });
        },
        [filename, category, assetId, updateDraft],
    );

    const handleSave = useCallback(async () => {
        if (!isReady || !isDirty) return;
        try {
            await save();
            log("success", `Saved asset '${assetId}'.`);
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            log("error", `Failed to save: ${message}`);
        }
    }, [isReady, isDirty, save, assetId, log]);

    const handleDiscard = useCallback(() => {
        discard();
    }, [discard]);

    useAssetTabGuard({
        assetId,
        tabId,
        isDirty,
        requestSave: handleSave,
        discardChanges: handleDiscard,
        upsertGuard,
        removeGuard,
    });

    const handleBack = useCallback(() => {
        openFile(`list::${filename}::assets::${category}`);
    }, [openFile, filename, category]);

    return {
        isLoading: !isReady,
        draft: assetDraft ?? undefined,
        sessionId: filename,
        canUndo,
        canRedo,
        isDirty,
        undo,
        redo,
        handleBack,
        handleSave,
        handleChange,
    };
}

