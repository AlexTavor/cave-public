import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import type { SessionActions, SessionState } from "./types";
import { createLifecycleActions } from "./actionsLifecycle";
import { createEditingActions } from "./actionsEditing";
import { createUiActions } from "./actionsUi";
import { createHistoryActions } from "./actionsHistory";

enableMapSet();

export const useSessionStore = create<SessionState & SessionActions>()(
    immer((set, get) => ({
        sessions: {},
        ...createLifecycleActions(set),
        ...createEditingActions(set),
        ...createUiActions(set, get),
        ...createHistoryActions(set),
    })),
);
