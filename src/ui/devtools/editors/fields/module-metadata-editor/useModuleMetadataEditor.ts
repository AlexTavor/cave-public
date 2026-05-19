import { useEffect, useCallback } from "react";
import { useShellStore } from "../../../shell/shell";
import { useTabGuardStore } from "../../../state/tabGuardStore";
import { useSessionStore } from "../../../state/useSessionStore";
import {
    useEnsureModuleSession,
    useModuleSession,
} from "../../../state/moduleSession";

export function useModuleMetadataEditor(filename: string, tabId?: string) {
    const { openFile, log } = useShellStore();
    const upsertGuard = useTabGuardStore((s) => s.upsertGuard);
    const removeGuard = useTabGuardStore((s) => s.removeGuard);

    useEnsureModuleSession(filename);
    const moduleSession = useModuleSession(filename);
    const { isReady, isDirty, canUndo, canRedo, undo, redo, save, discard } =
        moduleSession;

    const draft = useSessionStore(
        useCallback(
            (state) => state.sessions[filename]?.draft.metadata,
            [filename],
        ),
    );

    const handleSave = useCallback(async () => {
        if (!isReady || !isDirty) return;
        try {
            await save();
            log("success", "Updated module metadata.");
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            log("error", `Failed to save: ${message}`);
        }
    }, [isReady, isDirty, save, log]);

    const handleDiscard = useCallback(() => {
        discard();
    }, [discard]);

    useEffect(() => {
        if (!tabId) return;
        upsertGuard({
            tabId,
            title: "Metadata",
            isDirty,
            requestSave: isDirty ? handleSave : async () => {},
            discardChanges: handleDiscard,
        });
        return () => removeGuard(tabId);
    }, [tabId, isDirty, upsertGuard, removeGuard, handleSave, handleDiscard]);

    const handleBack = useCallback(() => {
        openFile(`module::${filename}`);
    }, [openFile, filename]);

    return {
        isLoading: !isReady,
        draft,
        sessionId: filename,
        canUndo,
        canRedo,
        isDirty,
        undo,
        redo,
        handleBack,
        handleSave,
    };
}
