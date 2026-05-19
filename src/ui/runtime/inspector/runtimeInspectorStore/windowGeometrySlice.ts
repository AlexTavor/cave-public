import type { WritableDraft } from "immer";
import type { RuntimeInspectorState } from "../runtimeInspectorStore.types";
import {
    clampInspectorMove,
    clampInspectorResize,
} from "../runtimeInspectorLayout";

const getViewport = () => ({
    width: globalThis.innerWidth || 1280,
    height: globalThis.innerHeight || 720,
});

export type GeometrySliceActions = Pick<
    RuntimeInspectorState,
    "moveWindow" | "resizeWindow"
>;

export const createGeometryActions = (
    set: (fn: (state: WritableDraft<RuntimeInspectorState>) => void) => void,
): GeometrySliceActions => ({
    moveWindow: (windowId, x, y) =>
        set((state) => {
            const window = state.windows.find(
                (item) => item.id === windowId,
            );
            if (!window) return;
            Object.assign(
                window,
                clampInspectorMove(
                    { ...window, x, y },
                    getViewport().width,
                    getViewport().height,
                ),
            );
        }),

    resizeWindow: (windowId, width, height) =>
        set((state) => {
            const window = state.windows.find(
                (item) => item.id === windowId,
            );
            if (!window) return;
            Object.assign(
                window,
                clampInspectorResize(
                    { ...window, width, height },
                    getViewport().width,
                    getViewport().height,
                ),
            );
        }),
});
