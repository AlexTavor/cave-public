import type { SetState, SessionActions } from "./types";
import { createSession } from "../sessionLogic";
import {
    clearPersistedDraft,
    loadPersistedDraft,
    persistDraft,
} from "./storage";
import {
    clearPersistedSessionUi,
    loadPersistedSessionUi,
} from "./storageSessionUi";
import { applyPersistedDraft } from "./utils";

export const createLifecycleActions = (
    set: SetState,
): Pick<SessionActions, "initSession" | "closeSession"> => ({
    initSession: (id, initialData) => {
        set((state) => {
            if (state.sessions[id]) return;
            const session = createSession(id, initialData);
            const persisted = loadPersistedDraft(id);
            if (persisted) {
                applyPersistedDraft(session, persisted);
            }
            const savedUi = loadPersistedSessionUi(id);
            if (savedUi) {
                session.ui = savedUi;
            }
            state.sessions[id] = session;
            if (session.isDirty) {
                persistDraft(id, session.draft);
            }
        });
    },
    closeSession: (id) => {
        set((state) => {
            delete state.sessions[id];
            clearPersistedDraft(id);
            clearPersistedSessionUi(id);
        });
    },
});
