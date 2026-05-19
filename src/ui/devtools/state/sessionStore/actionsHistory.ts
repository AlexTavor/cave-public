import { current } from "immer";
import type { SetState, SessionActions } from "./types";
import { refreshDirtyState } from "./utils";

export const createHistoryActions = (
    set: SetState,
): Pick<SessionActions, "undo" | "redo"> => ({
    undo: (id) => {
        set((state) => {
            const session = state.sessions[id];
            if (!session || session.history.past.length === 0) return;
            const previous = session.history.past.pop();
            if (!previous) return;
            const snapshot = current(session.draft);
            session.history.future.push(snapshot);
            session.draft = previous;
            refreshDirtyState(session);
        });
    },
    redo: (id) => {
        set((state) => {
            const session = state.sessions[id];
            if (!session || session.history.future.length === 0) return;
            const next = session.history.future.pop();
            if (!next) return;
            const snapshot = current(session.draft);
            session.history.past.push(snapshot);
            session.draft = next;
            refreshDirtyState(session);
        });
    },
});

