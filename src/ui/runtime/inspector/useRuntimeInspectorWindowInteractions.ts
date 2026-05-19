import type React from "react";
import type { RuntimeInspectorBounds } from "./runtimeInspectorTypes";
import { runtimeInspectorStore } from "./runtimeInspectorStore";

const bindSession = (
    pointerId: number,
    startX: number,
    startY: number,
    onDelta: (dx: number, dy: number) => void,
): void => {
    const move = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        onDelta(event.clientX - startX, event.clientY - startY);
    };
    const stop = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", stop);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
};

export const useRuntimeInspectorWindowInteractions = (
    windowId: string,
    bounds: RuntimeInspectorBounds,
) => {
    const focus = () => runtimeInspectorStore.getState().focusWindow(windowId);

    const onWindowPointerDown = () => focus();

    const onHeaderPointerDown = (event: React.PointerEvent<HTMLElement>) => {
        event.preventDefault();
        focus();
        bindSession(event.pointerId, event.clientX, event.clientY, (dx, dy) =>
            runtimeInspectorStore
                .getState()
                .moveWindow(windowId, bounds.x + dx, bounds.y + dy),
        );
    };

    const onResizeHandlePointerDown = (
        event: React.PointerEvent<HTMLElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        focus();
        bindSession(event.pointerId, event.clientX, event.clientY, (dx, dy) =>
            runtimeInspectorStore
                .getState()
                .resizeWindow(windowId, bounds.width + dx, bounds.height + dy),
        );
    };

    return {
        onWindowPointerDown,
        onHeaderPointerDown,
        onResizeHandlePointerDown,
    };
};
