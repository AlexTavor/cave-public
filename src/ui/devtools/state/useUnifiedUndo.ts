import { useUndoHistoryStore } from "./useUndoHistoryStore";
import { useSessionStore } from "./useSessionStore";
import { useProjectHistoryStore } from "./useProjectHistoryStore";

export interface UnifiedUndoApi {
    canUndo: boolean;
    canRedo: boolean;
    isBusy: boolean;
    undo: () => Promise<void>;
    redo: () => Promise<void>;
}

export const useUnifiedUndo = (): UnifiedUndoApi => {
    const canUndo = useUndoHistoryStore((s) => s.canUndo);
    const canRedo = useUndoHistoryStore((s) => s.canRedo);
    const isBusy = useUndoHistoryStore((s) => s.isBusy);

    return { canUndo, canRedo, isBusy, undo: executeUndo, redo: executeRedo };
};

const executeUndo = async (): Promise<void> => {
    const hist = useUndoHistoryStore.getState();
    const entry = hist.peekUndo();
    if (!entry || hist.isBusy) return;

    hist.setBusy(true);
    try {
        if (entry.kind === "session") {
            useSessionStore.getState().undo(entry.sessionId);
        } else {
            await useProjectHistoryStore.getState().undo();
        }
        useUndoHistoryStore.getState().commitUndo();
    } finally {
        useUndoHistoryStore.getState().setBusy(false);
    }
};

const executeRedo = async (): Promise<void> => {
    const hist = useUndoHistoryStore.getState();
    const entry = hist.peekRedo();
    if (!entry || hist.isBusy) return;

    hist.setBusy(true);
    try {
        if (entry.kind === "session") {
            useSessionStore.getState().redo(entry.sessionId);
        } else {
            await useProjectHistoryStore.getState().redo();
        }
        useUndoHistoryStore.getState().commitRedo();
    } finally {
        useUndoHistoryStore.getState().setBusy(false);
    }
};
