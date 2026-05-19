import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type { RuntimeInspectorState } from "../runtimeInspectorStore.types";

export type { RuntimeInspectorState };

import {
    lifecycleInitialState,
    createLifecycleActions,
} from "./windowLifecycleSlice";
import { createGeometryActions } from "./windowGeometrySlice";

export const runtimeInspectorStore = create<RuntimeInspectorState>()(
    immer((set) => ({
        ...lifecycleInitialState,
        ...createLifecycleActions(set),
        ...createGeometryActions(set),
    })),
);

export const useRuntimeInspectorStore = runtimeInspectorStore;
export const selectRuntimeInspectorWindows = (state: RuntimeInspectorState) =>
    state.windows;
