// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const testMocks = vi.hoisted(() => ({
    exportState: vi.fn<() => Promise<Record<string, unknown>>>(),
    saveJsonToDisk:
        vi.fn<
            (path: string, content: Record<string, unknown>) => Promise<void>
        >(),
    loadCartridge: vi.fn(),
}));

vi.mock("../../../engine/vfs/FileSystem", () => ({
    vfs: {
        exportState: testMocks.exportState,
        saveJsonToDisk: testMocks.saveJsonToDisk,
        listFiles: vi.fn(async () => []),
        saveToDisk: vi.fn(async () => undefined),
    },
}));
vi.mock("../../runtime/state/useRuntimeStore", () => ({
    useRuntimeStore: (
        selector: (state: {
            loadCartridge: typeof testMocks.loadCartridge;
        }) => unknown,
    ) => selector({ loadCartridge: testMocks.loadCartridge }),
}));
vi.mock("../project/projectSaveRegistry", () => ({
    runProjectSaveHandlers: vi.fn(async () => ({
        total: 0,
        failed: 0,
        success: 0,
    })),
}));

import { useGlobalEditorToolbarActions } from "./useGlobalEditorToolbarActions";

describe("useGlobalEditorToolbarActions bootstrap export", () => {
    it("exports a filtered VFS snapshot and reports success", async () => {
        const log = vi.fn();
        const pushToast = vi.fn();
        testMocks.exportState.mockResolvedValue({
            "manifest.json": {},
            "saves/autosave.json": {},
            "game_data.json": {},
        });
        const { result } = renderHook(() =>
            useGlobalEditorToolbarActions({
                moduleFilename: null,
                activeFilePath: "manifest.json",
                save: vi.fn(),
                log,
                pushToast,
            }),
        );

        await act(async () => {
            await result.current.handleExportBootstrap();
        });

        expect(testMocks.saveJsonToDisk).toHaveBeenCalledWith(
            "public/bootstrap/vfs-prod.json",
            { "manifest.json": {} },
        );
        expect(pushToast).toHaveBeenCalledWith(
            "success",
            "Bootstrap snapshot exported to public/bootstrap/vfs-prod.json.",
        );
        expect(log).toHaveBeenCalledWith(
            "success",
            "Bootstrap snapshot exported to public/bootstrap/vfs-prod.json.",
        );
    });

    it("reports export failures and toggles exporting state across the async lifecycle", async () => {
        let release: (() => void) | undefined;
        testMocks.exportState.mockReturnValue(
            new Promise((resolve) => {
                release = () => resolve({});
            }),
        );
        testMocks.saveJsonToDisk.mockRejectedValue(
            new Error("disk write failed"),
        );
        const { result } = renderHook(() =>
            useGlobalEditorToolbarActions({
                moduleFilename: null,
                activeFilePath: "manifest.json",
                save: vi.fn(),
                log: vi.fn(),
                pushToast: vi.fn(),
            }),
        );

        const pending = result.current.handleExportBootstrap();

        await waitFor(() =>
            expect(result.current.isExportingBootstrap).toBe(true),
        );
        release?.();
        await act(async () => {
            await pending;
        });
        await waitFor(() =>
            expect(result.current.isExportingBootstrap).toBe(false),
        );
    });
});
