import type { RuntimeInspectorWindowRecord } from "./runtimeInspectorTypes";

export type RuntimeInspectorState = {
    windows: RuntimeInspectorWindowRecord[];
    nextZIndex: number;
    syncSelection: (entityId: string | null) => void;
    pinWindow: (windowId: string) => void;
    closeWindow: (windowId: string) => void;
    focusWindow: (windowId: string) => void;
    moveWindow: (windowId: string, x: number, y: number) => void;
    resizeWindow: (windowId: string, width: number, height: number) => void;
    closeWindowsForEntity: (entityId: string) => void;
    reset: () => void;
};
