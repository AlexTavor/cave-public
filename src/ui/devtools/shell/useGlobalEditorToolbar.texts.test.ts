// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const shellState = {
    activeModuleFilename: null,
    activeFilePath: "manifest.json",
    activeManifestPath: "project/manifest.json" as string | null,
    isLayoutMode: false,
    isTextsMode: false,
    log: vi.fn(),
    toggleEditor: vi.fn(),
    toggleLayoutMode: vi.fn(),
    toggleTextsMode: vi.fn(),
};
const sessionState = { sessions: {} as Record<string, { isDirty: boolean }> };
const mocks = vi.hoisted(() => ({
    workspaceService: {
        getManifestPath: vi.fn(() => "project/manifest.json"),
        moduleCache: new Map<string, unknown>([["a.bp", {}]]),
    },
}));

vi.mock("./shell", () => ({
    useShellStore: (selector: (state: any) => unknown) => selector(shellState),
}));
vi.mock("../state/useSessionStore", () => ({
    useSessionStore: (selector: (state: any) => unknown) =>
        selector(sessionState),
}));
vi.mock("../state/moduleSession", () => ({
    useEnsureModuleSession: vi.fn(),
    useModuleSession: vi.fn(() => ({
        isReady: true,
        isDirty: false,
        save: vi.fn(),
    })),
}));
vi.mock("../toast/toastStore", () => ({
    useToastStore: (selector: any) => selector({ push: vi.fn() }),
}));
vi.mock("../state/useUnifiedUndo", () => ({
    useUnifiedUndo: vi.fn(() => ({
        canUndo: true,
        canRedo: true,
        isBusy: false,
        undo: vi.fn(),
        redo: vi.fn(),
    })),
}));
vi.mock("./useGlobalEditorToolbarActions", () => ({
    useGlobalEditorToolbarActions: vi.fn(() => ({
        isSaving: false,
        isCompiling: false,
        isExportingBootstrap: false,
        handleSave: vi.fn(),
        handleCompile: vi.fn(),
        handleExportBootstrap: vi.fn(),
    })),
}));
vi.mock("../../../app-shell/useAppShellStore", () => ({
    useAppShellStore: (selector: any) =>
        selector({ openMainMenuFromDevtools: vi.fn() }),
}));
vi.mock("../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: mocks.workspaceService,
}));

import { useGlobalEditorToolbar } from "./useGlobalEditorToolbar";

describe("useGlobalEditorToolbar texts gating", () => {
    beforeEach(() => {
        Object.assign(shellState, {
            activeManifestPath: "project/manifest.json",
            isLayoutMode: false,
            isTextsMode: false,
        });
        sessionState.sessions = {};
        mocks.workspaceService.getManifestPath.mockReturnValue(
            "project/manifest.json",
        );
        mocks.workspaceService.moduleCache = new Map([["a.bp", {}]]);
    });

    it("disables texts when manifest is missing, layout is active, texts is active, or a session is dirty", () => {
        shellState.activeManifestPath = null;
        expect(
            renderHook(() => useGlobalEditorToolbar()).result.current
                ?.disableTexts,
        ).toBe(true);
        shellState.activeManifestPath = "project/manifest.json";
        shellState.isLayoutMode = true;
        expect(
            renderHook(() => useGlobalEditorToolbar()).result.current
                ?.disableTexts,
        ).toBe(true);
        shellState.isLayoutMode = false;
        shellState.isTextsMode = true;
        expect(
            renderHook(() => useGlobalEditorToolbar()).result.current
                ?.disableTexts,
        ).toBe(true);
        shellState.isTextsMode = false;
        sessionState.sessions = { "a.bp": { isDirty: true } };
        expect(
            renderHook(() => useGlobalEditorToolbar()).result.current
                ?.disableTexts,
        ).toBe(true);
    });

    it("opens texts mode with the active manifest path", () => {
        const { result } = renderHook(() => useGlobalEditorToolbar());
        act(() => result.current?.handleTexts());
        expect(shellState.toggleTextsMode).toHaveBeenCalledWith(
            true,
            "project/manifest.json",
        );
    });

    it("ignores dirty sessions outside the active project", () => {
        sessionState.sessions = { "other.bp": { isDirty: true } };
        expect(
            renderHook(() => useGlobalEditorToolbar()).result.current
                ?.disableTexts,
        ).toBe(false);
    });
});
