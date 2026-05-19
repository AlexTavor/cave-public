import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { defaultLayout } from "../shell/defaultLayout";
import { type LayoutState, type LayoutActions, type TabNodeConfig } from "./layoutStore.types";
import {
    ensurePopouts,
    canonicalize,
    normalizeTabConfig,
    findFirstTabset,
    findTabsetById,
    findTab,
    clampSelected,
} from "./layoutModelUtils";

export type { LayoutState, LayoutActions, TabNodeConfig } from "./layoutStore.types";

const memoryStorage = (() => {
    const store = new Map<string, string>();
    return {
        getItem: (name: string) => store.get(name) ?? null,
        setItem: (name: string, value: string) => {
            store.set(name, value);
        },
        removeItem: (name: string) => {
            store.delete(name);
        },
    };
})();

const resolveStorage = () => {
    if (!globalThis.window) return memoryStorage;
    try {
        return globalThis.window.localStorage;
    } catch {
        return memoryStorage;
    }
};

export const useLayoutStore = create<LayoutState & LayoutActions>()(
    persist(
        immer((set) => ({
            // Canonicalize default layout at startup so it matches FlexLayout output
            model: canonicalize(ensurePopouts(defaultLayout)),
            activeTabId: null,

            setModel: (modelJson) => {
                const canonical = canonicalize(ensurePopouts(modelJson));
                set((s) => {
                    s.model = canonical;
                });
            },

            setActiveTab: (tabId: string): void => {
                set((state) => {
                    state.activeTabId = tabId;
                });
            },

            openTab: (nodeConfig: TabNodeConfig): void => {
                set((state) => {
                    if (!nodeConfig?.id) return;

                    state.model = ensurePopouts(state.model);

                    // If tab already exists, just select it.
                    const existing = findTab(state.model, nodeConfig.id);
                    if (existing) {
                        existing.tabset.active = true;
                        existing.tabset.selected = existing.index;
                        state.activeTabId = nodeConfig.id;

                        // Normalize after mutation
                        state.model = canonicalize(state.model);
                        return;
                    }

                    // Prefer "main" tabset, otherwise first tabset in tree.
                    const root = (state.model as any).layout;
                    const mainTabset = root
                        ? findTabsetById(root, "main")
                        : null;

                    const tabset = mainTabset ?? findFirstTabset(root);
                    if (!tabset) return;

                    tabset.children ??= [];
                    tabset.children.push(normalizeTabConfig(nodeConfig));

                    tabset.active = true;
                    tabset.selected = tabset.children.length - 1;

                    state.activeTabId = nodeConfig.id;

                    // Normalize after mutation
                    state.model = canonicalize(state.model);
                });
            },

            closeTab: (nodeId: string): void => {
                set((state) => {
                    state.model = ensurePopouts(state.model);

                    const found = findTab(state.model, nodeId);
                    if (!found) return;

                    found.tabset.children.splice(found.index, 1);
                    clampSelected(found.tabset);

                    if (state.activeTabId === nodeId) {
                        state.activeTabId = null;
                    }

                    // Normalize after mutation
                    state.model = canonicalize(state.model);
                });
            },

            selectTab: (tabId: string): void => {
                set((state) => {
                    state.model = ensurePopouts(state.model);

                    const found = findTab(state.model, tabId);
                    if (!found) return;

                    found.tabset.active = true;
                    found.tabset.selected = found.index;
                    state.activeTabId = tabId;

                    state.model = canonicalize(state.model);
                });
            },

            renameTab: (nodeId: string, title: string): void => {
                set((state) => {
                    state.model = ensurePopouts(state.model);

                    const found = findTab(state.model, nodeId);
                    if (!found) return;

                    const tab = found.tabset.children[found.index];
                    tab.name = title;

                    // Normalize after mutation
                    state.model = canonicalize(state.model);
                });
            },
        })),
        {
            name: "cave-os-layout-store-v2",
            storage: createJSONStorage(resolveStorage),
        },
    ),
);
