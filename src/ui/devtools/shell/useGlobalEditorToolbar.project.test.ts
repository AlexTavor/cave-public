// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGlobalEditorToolbar } from "./useGlobalEditorToolbar";
import { useShellStore } from "./shell";
import { useUndoHistoryStore } from "../state/useUndoHistoryStore";

const moduleSessionMock = vi.hoisted(() => ({
    draft: null,
    isReady: false,
    isDirty: false,
    canUndo: false,
    canRedo: false,
    isSaving: false,
    save: vi.fn(async () => null),
    undo: vi.fn(),
    redo: vi.fn(),
    discard: vi.fn(),
}));

vi.mock("../state/moduleSession", () => ({
    useEnsureModuleSession: vi.fn(),
    useModuleSession: vi.fn(() => moduleSessionMock),
}));
vi.mock("../../../engine/vfs/FileSystem", () => ({
    vfs: {
        listFiles: vi.fn(async () => []),
        saveToDisk: vi.fn(async () => undefined),
    },
}));
vi.mock("../project/projectSaveRegistry", () => ({
    runProjectSaveHandlers: vi.fn(async () => ({
        total: 0,
        failed: 0,
        success: 0,
    })),
}));

describe("useGlobalEditorToolbar project undo/redo", () => {
    beforeEach(() => {
        useShellStore.setState({
            activeModuleFilename: null,
            activeFilePath: "manifest.json",
            activeManifestPath: null,
            isLayoutMode: false,
            toggleLayoutMode: vi.fn(),
        });
        useUndoHistoryStore.setState({
            canUndo: true,
            canRedo: false,
            isBusy: false,
        });
    });

    it("uses unified history flags when no module is active", () => {
        const { result } = renderHook(() => useGlobalEditorToolbar());
        expect(result.current?.disableUndo).toBe(false);
        expect(result.current?.disableRedo).toBe(true);
        expect(result.current?.disableCompile).toBe(false);
        expect(typeof result.current?.handleCompile).toBe("function");
        expect(result.current?.statusLabel).toBe("Up to Date");
        expect(result.current?.statusVariant).toBe("clean");
        expect(result.current?.disablePhysics).toBe(true);
    });

    it("ignores stale nested activeModuleFilename values", () => {
        useShellStore.setState({
            activeModuleFilename: "cave_roguelite_gdd_v2/manifest.json",
            activeFilePath: "cave_roguelite_gdd_v2/manifest.json",
        });
        const { result } = renderHook(() => useGlobalEditorToolbar());
        expect(result.current?.statusLabel).toBe("Up to Date");
        expect(result.current?.statusVariant).toBe("clean");
    });

    it("disables physics when no project is loaded", () => {
        useShellStore.setState({
            activeModuleFilename: null,
            activeFilePath: "notes.txt",
            activeManifestPath: null,
        });
        const { result } = renderHook(() => useGlobalEditorToolbar());
        expect(result.current?.disablePhysics).toBe(true);
    });

    it("opens layout mode for the loaded project when available", async () => {
        const toggleLayoutMode = vi.fn();
        useShellStore.setState({
            activeModuleFilename: "modules/actors.bp",
            activeFilePath: "modules/actors.bp",
            activeManifestPath: "project/manifest.json",
            toggleLayoutMode,
        });
        const { result } = renderHook(() => useGlobalEditorToolbar());
        act(() => {
            result.current?.handlePhysics();
        });
        await waitFor(() => {
            expect(toggleLayoutMode).toHaveBeenCalledWith(
                true,
                "project/manifest.json",
            );
        });
    });
});

