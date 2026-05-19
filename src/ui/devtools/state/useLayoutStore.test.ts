import { describe, it, expect, beforeEach } from "vitest";
import { useLayoutStore } from "./useLayoutStore";

describe("useLayoutStore", () => {
    beforeEach(() => {
        useLayoutStore.setState({
            model: {
                global: {},
                borders: [],
                layout: {
                    type: "row",
                    id: "root",
                    children: [
                        {
                            type: "tabset",
                            id: "main",
                            children: [],
                        },
                    ],
                },
            },
            activeTabId: null,
        });
    });

    it("opens a new tab", () => {
        const node = { type: "tab" as const, id: "tab1", name: "Tab 1" };
        useLayoutStore.getState().openTab(node);

        const state = useLayoutStore.getState();
        expect(state.activeTabId).toBe("tab1");

        const modelJson = JSON.stringify(state.model);
        expect(modelJson).toContain("tab1");
    });

    it("selects existing tab if already open", () => {
        const node = { type: "tab" as const, id: "tab1", name: "Tab 1" };
        useLayoutStore.getState().openTab(node);

        // Open another to change focus? or just re-open
        const node2 = { type: "tab" as const, id: "tab2", name: "Tab 2" };
        useLayoutStore.getState().openTab(node2);
        expect(useLayoutStore.getState().activeTabId).toBe("tab2");

        // Re-open tab1
        useLayoutStore.getState().openTab(node);
        expect(useLayoutStore.getState().activeTabId).toBe("tab1");

        // Check duplication (string count)
        const modelJson = JSON.stringify(useLayoutStore.getState().model);
        const matches = modelJson.match(/"id":"tab1"/g);
        expect(matches?.length).toBe(1);
    });

    it("closes a tab", () => {
        const node = { type: "tab" as const, id: "tab1", name: "Tab 1" };
        useLayoutStore.getState().openTab(node);

        useLayoutStore.getState().closeTab("tab1");

        const modelJson = JSON.stringify(useLayoutStore.getState().model);
        expect(modelJson).not.toContain("tab1");
    });

    it("renames a tab", () => {
        const node = { type: "tab" as const, id: "tab1", name: "Tab 1" };
        useLayoutStore.getState().openTab(node);

        useLayoutStore.getState().renameTab("tab1", "New Name");

        const modelJson = JSON.stringify(useLayoutStore.getState().model);
        expect(modelJson).toContain("New Name");
    });
});
