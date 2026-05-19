import { current } from "immer";
import type { SetState, SessionActions } from "./types";
import { commitSession, discardSession } from "../sessionLogic";
import { deepClone } from "../../../../utils/objectUtils";
import { clearPersistedDraft } from "./storage";
import { refreshDirtyState } from "./utils";
import { useUndoHistoryStore } from "../useUndoHistoryStore";

const MAX_HISTORY = 500;

export const createEditingActions = (
    set: SetState,
): Pick<
    SessionActions,
    "updateDraft" | "replaceDraft" | "commitDraft" | "discardDraft"
> => ({
    updateDraft: (id, recipe) => {
        set((state) => {
            const session = state.sessions[id];
            if (!session) return;
            useUndoHistoryStore.getState().recordSessionEdit(id);
            const snapshot = current(session.draft);
            session.history.past.push(snapshot);
            if (session.history.past.length > MAX_HISTORY) {
                session.history.past.shift();
            }
            session.history.future = [];
            recipe(session.draft);
            refreshDirtyState(session);
        });
    },
    replaceDraft: (id, nextDraft) => {
        set((state) => {
            const session = state.sessions[id];
            if (!session) return;
            useUndoHistoryStore.getState().recordSessionEdit(id);
            const snapshot = current(session.draft);
            session.history.past.push(snapshot);
            if (session.history.past.length > MAX_HISTORY) {
                session.history.past.shift();
            }
            session.history.future = [];
            session.draft = deepClone(nextDraft);
            refreshDirtyState(session);
        });
    },
    commitDraft: (id) => {
        set((state) => {
            const session = state.sessions[id];
            if (!session) return;
            commitSession(session);
            clearPersistedDraft(id);
        });
    },
    discardDraft: (id) => {
        set((state) => {
            const session = state.sessions[id];
            if (!session) return;
            discardSession(session);
            clearPersistedDraft(id);
        });
    },
});

