import type { ModuleCartridge } from "../../../../data/schemas/module";
import type {
    Session,
    SessionFlushHandler,
    SessionId,
    SessionScopeId,
    SessionUiState,
} from "../sessionLogic";

export interface SessionState {
    sessions: Record<SessionId, Session<ModuleCartridge>>;
}

export interface SessionActions {
    initSession: (id: SessionId, initialData: ModuleCartridge) => void;
    closeSession: (id: SessionId) => void;

    updateDraft: (
        id: SessionId,
        recipe: (draft: ModuleCartridge) => void,
    ) => void;
    replaceDraft: (id: SessionId, nextDraft: ModuleCartridge) => void;
    commitDraft: (id: SessionId) => void;
    discardDraft: (id: SessionId) => void;

    updateSessionUi: (
        id: SessionId,
        scopeId: SessionScopeId | null,
        recipe: (ui: SessionUiState) => void,
    ) => void;
    registerFlushHandler: (
        id: SessionId,
        handlerId: string,
        handler: SessionFlushHandler,
    ) => void;
    unregisterFlushHandler: (id: SessionId, handlerId: string) => void;
    flushSession: (id: SessionId) => Promise<void>;

    undo: (id: SessionId) => void;
    redo: (id: SessionId) => void;
}

export type SessionStoreState = SessionState & SessionActions;
export type SetState = (fn: (state: SessionStoreState) => void) => void;
export type GetState = () => SessionStoreState;
