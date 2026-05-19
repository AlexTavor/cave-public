import type { GetState, SetState, SessionActions } from "./types";
import { ensureScopeUi } from "./utils";
import { persistSessionUi } from "./storageSessionUi";

export const createUiActions = (
    set: SetState,
    get: GetState,
): Pick<
    SessionActions,
    | "updateSessionUi"
    | "registerFlushHandler"
    | "unregisterFlushHandler"
    | "flushSession"
> => ({
    updateSessionUi: (id, scopeId, recipe) => {
        set((state) => {
            const session = state.sessions[id];
            if (!session) return;
            const scope = ensureScopeUi(session, scopeId);
            recipe(scope);
        });
        const session = get().sessions[id];
        if (session) persistSessionUi(id, session.ui);
    },
    registerFlushHandler: (id, handlerId, handler) => {
        set((state) => {
            const session = state.sessions[id];
            if (!session) return;
            session.flushHandlers[handlerId] = handler;
        });
    },
    unregisterFlushHandler: (id, handlerId) => {
        set((state) => {
            const session = state.sessions[id];
            if (!session) return;
            delete session.flushHandlers[handlerId];
        });
    },
    flushSession: async (id) => {
        const session = get().sessions[id];
        if (!session) return;
        const handlers = Object.values(session.flushHandlers);
        for (const flush of handlers) {
            try {
                await flush();
            } catch (error) {
                console.error("Failed to flush session handler", error);
            }
        }
    },
});
