// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const testMocks = vi.hoisted(() => ({
    getDirtyFiles: vi.fn<() => string[]>(),
    listFiles: vi.fn<() => Promise<string[]>>(),
    loadCartridge: vi.fn(),
    saveToDisk: vi.fn<(path: string) => Promise<void>>(),
}));

vi.mock("../../../engine/vfs/FileSystem", () => ({
    vfs: testMocks,
}));
vi.mock("../../runtime/state/useRuntimeStore", () => ({
    useRuntimeStore: (
        selector: (state: { loadCartridge: () => void }) => unknown,
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

describe("useGlobalEditorToolbarActions save", () => {
    it("writes only dirty exportable files", async () => {
        testMocks.getDirtyFiles.mockReturnValue([
            "modules/core.cave",
            "saves/autosave.json",
        ]);
        testMocks.listFiles.mockResolvedValue(["modules/core.cave"]);
        testMocks.saveToDisk.mockResolvedValue(undefined);
        const { result } = renderHook(() =>
            useGlobalEditorToolbarActions({
                moduleFilename: null,
                activeFilePath: "modules/core.cave",
                save: vi.fn(),
                log: vi.fn(),
                pushToast: vi.fn(),
            }),
        );

        await act(async () => {
            await result.current.handleSave();
        });

        expect(testMocks.saveToDisk).toHaveBeenCalledTimes(1);
        expect(testMocks.saveToDisk).toHaveBeenCalledWith("modules/core.cave");
        expect(testMocks.listFiles).not.toHaveBeenCalled();
    });
});
