import { useCallback, useEffect, useState } from "react";
import type { ModuleCartridge } from "../../../../data/schemas/module";
import { useSessionStore } from "../useSessionStore";
import { useModuleStore } from "../moduleStore";
import { useUnifiedUndo } from "../useUnifiedUndo";

export interface ModuleSessionHandle {
    draft: ModuleCartridge | null;
    isReady: boolean;
    isDirty: boolean;
    canUndo: boolean;
    canRedo: boolean;
    isSaving: boolean;
    save: () => Promise<ModuleCartridge | null>;
    undo: () => void;
    redo: () => void;
    discard: () => void;
}

export const useModuleSession = (
    filename: string | null,
): ModuleSessionHandle => {
    const session = useSessionStore((state) =>
        filename ? (state.sessions[filename] ?? null) : null,
    );
    const discardAction = useSessionStore((s) => s.discardDraft);
    const replaceDraft = useSessionStore((s) => s.replaceDraft);
    const commitDraft = useSessionStore((s) => s.commitDraft);
    const flushSession = useSessionStore((s) => s.flushSession);
    const saveModuleCartridge = useModuleStore((s) => s.saveModuleCartridge);
    const unified = useUnifiedUndo();

    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => {
        setIsSaving(false);
    }, [filename]);

    const save = useCallback(async () => {
        if (!filename || !session || isSaving) {
            return null;
        }
        setIsSaving(true);
        try {
            await flushSession(filename);
            const saved = await saveModuleCartridge({
                filename,
                module: session.draft,
            });
            replaceDraft(filename, saved);
            commitDraft(filename);
            return saved;
        } finally {
            setIsSaving(false);
        }
    }, [
        filename,
        session,
        isSaving,
        flushSession,
        saveModuleCartridge,
        replaceDraft,
        commitDraft,
    ]);

    const undo = useCallback(() => {
        void unified.undo();
    }, [unified]);

    const redo = useCallback(() => {
        void unified.redo();
    }, [unified]);

    const discard = useCallback(() => {
        if (filename) {
            discardAction(filename);
        }
    }, [filename, discardAction]);

    const isDirty = session?.isDirty ?? false;
    const canUndo = unified.canUndo;
    const canRedo = unified.canRedo;

    return {
        draft: session?.draft ?? null,
        isReady: Boolean(session),
        isDirty,
        canUndo,
        canRedo,
        isSaving,
        save,
        undo,
        redo,
        discard,
    };
};
