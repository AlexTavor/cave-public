import { beforeEach, describe, expect, it } from "vitest";
import { runtimeInspectorStore } from "./runtimeInspectorStore";

describe("runtimeInspectorStore", () => {
    beforeEach(() => {
        runtimeInspectorStore.getState().reset();
    });

    it("keeps a single transient selection window and retargets it", () => {
        runtimeInspectorStore.getState().syncSelection("body-1");
        runtimeInspectorStore.getState().syncSelection("body-2");
        const [window] = runtimeInspectorStore.getState().windows;
        expect(runtimeInspectorStore.getState().windows).toHaveLength(1);
        expect(window.mode).toBe("selection");
        expect(window.entityId).toBe("body-2");
    });

    it("pins a transient window and avoids duplicates for the same entity", () => {
        runtimeInspectorStore.getState().syncSelection("body-1");
        const [window] = runtimeInspectorStore.getState().windows;
        runtimeInspectorStore.getState().pinWindow(window.id);
        runtimeInspectorStore.getState().syncSelection("body-1");
        expect(runtimeInspectorStore.getState().windows).toHaveLength(1);
        expect(runtimeInspectorStore.getState().windows[0].mode).toBe("pinned");
    });

    it("allows multiple pinned windows and focuses the selected one", () => {
        runtimeInspectorStore.getState().syncSelection("body-1");
        runtimeInspectorStore
            .getState()
            .pinWindow(runtimeInspectorStore.getState().windows[0].id);
        runtimeInspectorStore.getState().syncSelection("body-2");
        runtimeInspectorStore
            .getState()
            .pinWindow(runtimeInspectorStore.getState().windows[1].id);
        const [first, second] = runtimeInspectorStore.getState().windows;
        runtimeInspectorStore.getState().focusWindow(first.id);
        const refreshed = runtimeInspectorStore.getState().windows;
        expect(runtimeInspectorStore.getState().windows).toHaveLength(2);
        expect(
            refreshed.find((window) => window.id === first.id)?.zIndex,
        ).toBeGreaterThan(
            refreshed.find((window) => window.id === second.id)?.zIndex ?? 0,
        );
    });

    it("closes entity windows and resets all state", () => {
        runtimeInspectorStore.getState().syncSelection("body-1");
        runtimeInspectorStore
            .getState()
            .pinWindow(runtimeInspectorStore.getState().windows[0].id);
        runtimeInspectorStore.getState().syncSelection("body-2");
        runtimeInspectorStore.getState().closeWindowsForEntity("body-1");
        expect(runtimeInspectorStore.getState().windows).toHaveLength(1);
        runtimeInspectorStore.getState().reset();
        expect(runtimeInspectorStore.getState().windows).toEqual([]);
    });
});
