// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TreeNode } from "../../../engine/vfs/types";
import { PROJECT_EXPLORER_UI_STATE_KEY } from "./projectExplorerUiState";
import { useProjectExplorer } from "./useProjectExplorer";

const tree: TreeNode = {
    name: ".",
    path: "",
    type: "directory",
    children: [
        { name: "a.bp", path: "a.bp", type: "file" },
        { name: "folder", path: "folder", type: "directory", children: [] },
    ],
};

const vfsMock = vi.hoisted(() => ({
    tree: vi.fn(async () => tree),
    movePaths: vi.fn(async () => undefined),
    deletePaths: vi.fn(async () => undefined),
    writeFile: vi.fn(async () => undefined),
}));

const historyMock = vi.hoisted(() => ({
    recordProjectSnapshot: vi.fn(async () => undefined),
}));

vi.mock("../../../engine/vfs/FileSystem", () => ({ vfs: vfsMock }));
vi.mock("../state/useProjectHistoryStore", () => historyMock);

describe("useProjectExplorer persistence", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        globalThis.localStorage?.clear();
    });

    it("seeds semantic templates for known file extensions", async () => {
        const { result } = renderHook(() => useProjectExplorer());
        await act(async () => {});

        await act(async () => {
            await result.current.handleCreateFile("", "a.bp", "file");
            await result.current.handleCreateFile("", "a.cave", "file");
            await result.current.handleCreateFile("", "a.draft", "file");
            await result.current.handleCreateFile("", "a.art", "file");
        });

        expect(vfsMock.writeFile).toHaveBeenNthCalledWith(1, "a.bp", {
            id: "a",
            label: "",
            tags: [],
            components: {},
            _editor: {},
        });
        expect(vfsMock.writeFile).toHaveBeenNthCalledWith(
            2,
            "a.cave",
            expect.objectContaining({ impulse: expect.any(Object) }),
        );
        expect(vfsMock.writeFile).toHaveBeenNthCalledWith(3, "a.draft", {
            draftOptions: {},
            draftPools: {},
        });
        expect(vfsMock.writeFile).toHaveBeenNthCalledWith(
            4,
            "a.art",
            expect.objectContaining({
                displays: {},
                styles: {},
                settings: expect.any(Object),
            }),
        );
    });

    it("restores expanded and selection state after remount", async () => {
        const first = renderHook(() => useProjectExplorer());
        await act(async () => {});

        act(() => first.result.current.handleToggleFolder("folder"));
        act(() => first.result.current.handleSelect("a.bp", "add"));
        await act(async () => {});
        first.unmount();

        const second = renderHook(() => useProjectExplorer());
        await act(async () => {});

        expect(second.result.current.expanded.has("folder")).toBe(true);
        expect(second.result.current.selection.has("a.bp")).toBe(true);
        expect(
            globalThis.localStorage?.getItem(PROJECT_EXPLORER_UI_STATE_KEY),
        ).toBeTruthy();
    });
});

