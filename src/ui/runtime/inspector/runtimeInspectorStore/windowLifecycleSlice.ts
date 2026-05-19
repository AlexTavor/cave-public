import { nanoid } from "nanoid";
import type { WritableDraft } from "immer";
import type { RuntimeInspectorState } from "../runtimeInspectorStore.types";
import { createDefaultInspectorBounds } from "../runtimeInspectorLayout";

const INITIAL_Z_INDEX = 1;

const getViewport = () => ({
    width: globalThis.innerWidth || 1280,
    height: globalThis.innerHeight || 720,
});

export type LifecycleSliceState = Pick<
    RuntimeInspectorState,
    "windows" | "nextZIndex"
>;

export type LifecycleSliceActions = Pick<
    RuntimeInspectorState,
    | "syncSelection"
    | "pinWindow"
    | "closeWindow"
    | "focusWindow"
    | "closeWindowsForEntity"
    | "reset"
>;

export type LifecycleSlice = LifecycleSliceState & LifecycleSliceActions;

export const lifecycleInitialState: LifecycleSliceState = {
    windows: [],
    nextZIndex: INITIAL_Z_INDEX,
};

export const createLifecycleActions = (
    set: (fn: (state: WritableDraft<RuntimeInspectorState>) => void) => void,
): LifecycleSliceActions => ({
    syncSelection: (entityId) =>
        set((state) => {
            const selection = state.windows.find(
                (w) => w.mode === "selection",
            );
            if (!entityId) {
                state.windows = state.windows.filter(
                    (w) => w.mode !== "selection",
                );
                return;
            }
            const pinned = state.windows.find(
                (w) => w.mode === "pinned" && w.entityId === entityId,
            );
            if (pinned) {
                state.windows = state.windows.filter(
                    (w) => w.mode !== "selection",
                );
                pinned.zIndex = state.nextZIndex++;
                return;
            }
            if (selection) {
                selection.entityId = entityId;
                selection.zIndex = state.nextZIndex++;
                return;
            }
            const viewport = getViewport();
            state.windows.push({
                id: nanoid(),
                entityId,
                mode: "selection",
                zIndex: state.nextZIndex++,
                ...createDefaultInspectorBounds(
                    state.windows.length,
                    viewport.width,
                    viewport.height,
                ),
            });
        }),

    pinWindow: (windowId) =>
        set((state) => {
            const window = state.windows.find(
                (item) => item.id === windowId,
            );
            if (!window || window.mode === "pinned") return;
            const duplicate = state.windows.find(
                (item) =>
                    item.mode === "pinned" &&
                    item.entityId === window.entityId,
            );
            if (duplicate) {
                state.windows = state.windows.filter(
                    (item) => item.id !== windowId,
                );
                duplicate.zIndex = state.nextZIndex++;
                return;
            }
            window.mode = "pinned";
            window.zIndex = state.nextZIndex++;
        }),

    closeWindow: (windowId) =>
        set((state) => {
            state.windows = state.windows.filter(
                (window) => window.id !== windowId,
            );
        }),

    focusWindow: (windowId) =>
        set((state) => {
            const window = state.windows.find(
                (item) => item.id === windowId,
            );
            if (window) window.zIndex = state.nextZIndex++;
        }),

    closeWindowsForEntity: (entityId) =>
        set((state) => {
            state.windows = state.windows.filter(
                (window) => window.entityId !== entityId,
            );
        }),

    reset: () =>
        set((state) => {
            state.windows = [];
            state.nextZIndex = INITIAL_Z_INDEX;
        }),
});
