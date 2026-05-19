import { useCallback, useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useShellStore } from "../shell/shell";
import { useModuleStore } from "../state/moduleStore";
import { useToastStore } from "../toast/toastStore";
import { buildTextRegistry } from "./buildTextRegistry";
import { findDirtyTextFiles } from "./dirtyTextFiles";
import { filterTextRegistry } from "./filterTextRegistry";
import { useTextsEditorStore } from "./state/useTextsEditorStore";
import {
    collectCategoryOptions,
    collectTypeOptions,
} from "./textRegistryOptions";
import {
    loadTextsDrafts,
    syncSavedTextsSession,
} from "./useTextsEditorController.utils";

export const useTextsEditorController = (manifestPath: string) => {
    const editorState = useTextsEditorStore(
        useShallow((state) => ({
            files: state.files,
            draftsByFile: state.draftsByFile,
            baselineByFile: state.baselineByFile,
            isLoading: state.isLoading,
            isSaving: state.isSaving,
            error: state.error,
            categoryFilter: state.categoryFilter,
            typeFilter: state.typeFilter,
            query: state.query,
        })),
    );
    const editorActions = useTextsEditorStore(
        useShallow((state) => ({
            beginLoad: state.beginLoad,
            finishLoad: state.finishLoad,
            failLoad: state.failLoad,
            setCategoryFilter: state.setCategoryFilter,
            setTypeFilter: state.setTypeFilter,
            setQuery: state.setQuery,
            beginSave: state.beginSave,
            finishSave: state.finishSave,
            failSave: state.failSave,
            discard: state.discard,
        })),
    );
    const log = useShellStore((state) => state.log);
    const toggleTextsMode = useShellStore((state) => state.toggleTextsMode);
    const pushToast = useToastStore((state) => state.push);

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            editorActions.beginLoad(manifestPath);
            try {
                const { files, draftsByFile } =
                    await loadTextsDrafts(manifestPath);
                if (!canceled) editorActions.finishLoad(files, draftsByFile);
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error);
                if (!canceled) editorActions.failLoad(message);
                log("error", `Failed to load texts editor: ${message}`);
            }
        };
        void load();
        return () => {
            canceled = true;
        };
    }, [editorActions, log, manifestPath]);

    const registry = useMemo(
        () => buildTextRegistry(editorState.draftsByFile, editorState.files),
        [editorState.draftsByFile, editorState.files],
    );
    const baseline = useMemo(
        () => buildTextRegistry(editorState.baselineByFile, editorState.files),
        [editorState.baselineByFile, editorState.files],
    );
    const blocks = useMemo(
        () =>
            filterTextRegistry(registry, {
                category: editorState.categoryFilter,
                type: editorState.typeFilter,
                query: editorState.query,
            }),
        [
            editorState.categoryFilter,
            editorState.query,
            editorState.typeFilter,
            registry,
        ],
    );

    const handleAbort = useCallback(() => {
        editorActions.discard();
        toggleTextsMode(false);
    }, [editorActions, toggleTextsMode]);

    const handleSave = useCallback(async () => {
        const dirtyFiles = findDirtyTextFiles(
            editorState.files,
            registry,
            baseline,
        );
        if (dirtyFiles.length === 0) {
            log("info", "Texts editor closed without file changes.");
            editorActions.discard();
            toggleTextsMode(false);
            return;
        }
        editorActions.beginSave();
        try {
            const savedByFile: Record<string, any> = {};
            for (const filename of dirtyFiles) {
                const draft = editorState.draftsByFile[filename];
                const saved = await useModuleStore
                    .getState()
                    .saveModuleCartridge({ filename, module: draft });
                syncSavedTextsSession(filename, saved);
                savedByFile[filename] = saved;
            }
            editorActions.finishSave(savedByFile);
            pushToast("success", `Saved ${dirtyFiles.length} text file(s).`);
            log(
                "success",
                `Saved texts editor changes for ${dirtyFiles.join(", ")}.`,
            );
            editorActions.discard();
            toggleTextsMode(false);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            editorActions.failSave(message);
            pushToast("error", message);
            log("error", `Failed to save texts editor: ${message}`);
        }
    }, [
        baseline,
        editorActions,
        editorState,
        log,
        pushToast,
        registry,
        toggleTextsMode,
    ]);

    return {
        isLoading: editorState.isLoading,
        isSaving: editorState.isSaving,
        error: editorState.error,
        blocks,
        categoryOptions: collectCategoryOptions(registry),
        typeOptions: collectTypeOptions(registry),
        filters: {
            category: editorState.categoryFilter,
            type: editorState.typeFilter,
            query: editorState.query,
        },
        setCategoryFilter: editorActions.setCategoryFilter,
        setTypeFilter: editorActions.setTypeFilter,
        setQuery: editorActions.setQuery,
        handleAbort,
        handleSave,
        canSave:
            !editorState.isLoading &&
            !editorState.isSaving &&
            !editorState.error,
    };
};
