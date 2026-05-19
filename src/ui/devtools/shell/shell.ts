import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useTerminalStore } from "../state/useTerminalStore";
import {
    parseVirtualPath,
    serializeVirtualPath,
} from "./window-manager/virtualPath";
import type { ShellState } from "./shell.types";

export type { LogEntry, ShellState } from "./shell.types";

export const useShellStore = create<ShellState>()(
    persist(
        (set) => ({
            activeFilePath: null,
            activeModuleFilename: null,
            isEditorOpen: true,
            activeManifestPath: null,
            tabTitles: {},
            isLayoutMode: false,
            layoutTargetFilename: null,
            isTextsMode: false,
            textsTargetManifestPath: null,
            openFile: (path) =>
                set(() => {
                    const parsed = parseVirtualPath(path);
                    const normalized = serializeVirtualPath(parsed);
                    return {
                        activeFilePath: normalized,
                        activeModuleFilename: parsed.filename,
                        isEditorOpen: true,
                    };
                }),
            closeFile: (path) =>
                set((state) => {
                    const parsed = parseVirtualPath(path);
                    const normalized = serializeVirtualPath(parsed);
                    const modulePath = serializeVirtualPath({
                        kind: "module",
                        filename: parsed.filename,
                    });

                    if (parsed.kind === "module") {
                        return {
                            activeFilePath: null,
                            activeModuleFilename:
                                state.activeModuleFilename === parsed.filename
                                    ? null
                                    : state.activeModuleFilename,
                        };
                    }

                    return {
                        activeFilePath:
                            state.activeFilePath === normalized
                                ? modulePath
                                : state.activeFilePath,
                    };
                }),
            toggleEditor: (isOpen) =>
                set((state) => ({
                    isEditorOpen: isOpen ?? !state.isEditorOpen,
                })),
            setTabTitle: (tabId, title) =>
                set((state) => {
                    if (state.tabTitles[tabId] === title) return state;
                    return {
                        tabTitles: { ...state.tabTitles, [tabId]: title },
                    };
                }),
            toggleLayoutMode: (active, filename) =>
                set((state) => {
                    if (active) {
                        const nextFilename =
                            filename ?? state.layoutTargetFilename;
                        if (!nextFilename) return state;
                        return {
                            isLayoutMode: true,
                            layoutTargetFilename: nextFilename,
                        };
                    }
                    return { isLayoutMode: false, layoutTargetFilename: null };
                }),
            toggleTextsMode: (active, manifestPath) =>
                set((state) => {
                    if (active) {
                        const nextManifestPath =
                            manifestPath ?? state.activeManifestPath;
                        if (!nextManifestPath) return state;
                        return {
                            isTextsMode: true,
                            textsTargetManifestPath: nextManifestPath,
                        };
                    }
                    return {
                        isTextsMode: false,
                        textsTargetManifestPath: null,
                    };
                }),
            setActiveManifest: (path) =>
                set(() => ({ activeManifestPath: path })),
            setActiveFileTabPath: (filePath) =>
                set(() => ({
                    activeFilePath: filePath,
                    activeModuleFilename: filePath,
                })),
            log: (type, content) => {
                useTerminalStore.getState().addLog({ type, content });
            },
        }),
        {
            name: "cave-os-shell-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                activeModuleFilename: state.activeModuleFilename,
                isEditorOpen: state.isEditorOpen,
                activeManifestPath: state.activeManifestPath,
            }),
        },
    ),
);

