// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const testMocks = vi.hoisted(() => ({
    handleExportBootstrap: vi.fn(async () => undefined),
    handleCompile: vi.fn(async () => undefined),
    handleSave: vi.fn(async () => undefined),
}));

vi.mock("./shell", () => ({
    useShellStore: (selector: (state: any) => unknown) =>
        selector({
            activeModuleFilename: null,
            activeFilePath: "manifest.json",
            activeManifestPath: "manifest.json",
            isLayoutMode: false,
            log: vi.fn(),
            toggleLayoutMode: vi.fn(),
        }),
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
    useToastStore: (selector: (state: any) => unknown) =>
        selector({ push: vi.fn() }),
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
        handleSave: testMocks.handleSave,
        handleCompile: testMocks.handleCompile,
        handleExportBootstrap: testMocks.handleExportBootstrap,
    })),
}));

import { useGlobalEditorToolbar } from "./useGlobalEditorToolbar";

describe("useGlobalEditorToolbar", () => {
    it("exposes bootstrap export state and handler", () => {
        const { result } = renderHook(() => useGlobalEditorToolbar());
        expect(result.current?.disableExportBootstrap).toBe(false);
        expect(result.current?.handleExportBootstrap).toBe(
            testMocks.handleExportBootstrap,
        );
    });

    it("disables bootstrap export while save, compile, or export is active", async () => {
        const { useGlobalEditorToolbarActions } =
            await import("./useGlobalEditorToolbarActions");
        vi.mocked(useGlobalEditorToolbarActions).mockReturnValueOnce({
            isSaving: true,
            isCompiling: false,
            isExportingBootstrap: false,
            handleSave: testMocks.handleSave,
            handleCompile: testMocks.handleCompile,
            handleExportBootstrap: testMocks.handleExportBootstrap,
        });
        expect(
            renderHook(() => useGlobalEditorToolbar()).result.current
                ?.disableExportBootstrap,
        ).toBe(true);

        vi.mocked(useGlobalEditorToolbarActions).mockReturnValueOnce({
            isSaving: false,
            isCompiling: true,
            isExportingBootstrap: false,
            handleSave: testMocks.handleSave,
            handleCompile: testMocks.handleCompile,
            handleExportBootstrap: testMocks.handleExportBootstrap,
        });
        expect(
            renderHook(() => useGlobalEditorToolbar()).result.current
                ?.disableExportBootstrap,
        ).toBe(true);

        vi.mocked(useGlobalEditorToolbarActions).mockReturnValueOnce({
            isSaving: false,
            isCompiling: false,
            isExportingBootstrap: true,
            handleSave: testMocks.handleSave,
            handleCompile: testMocks.handleCompile,
            handleExportBootstrap: testMocks.handleExportBootstrap,
        });
        expect(
            renderHook(() => useGlobalEditorToolbar()).result.current
                ?.disableExportBootstrap,
        ).toBe(true);
    });
});
