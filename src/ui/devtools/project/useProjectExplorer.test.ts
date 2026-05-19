// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TreeNode } from "../../../engine/vfs/types";
import { useProjectExplorer } from "./useProjectExplorer";

const tree: TreeNode = {
    name: ".",
    path: "",
    type: "directory",
    children: [
        { name: "a.bp", path: "a.bp", type: "file" },
        {
            name: "folder",
            path: "folder",
            type: "directory",
            children: [{ name: "b.bp", path: "folder/b.bp", type: "file" }],
        },
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

describe("useProjectExplorer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        globalThis.localStorage?.clear();
    });

    it("supports single and toggle selection", async () => {
        const { result } = renderHook(() => useProjectExplorer());
        await act(async () => {});

        act(() => result.current.handleSelect("a.bp", "add"));
        expect([...result.current.selection]).toEqual(["a.bp"]);

        act(() => result.current.handleSelect("folder/b.bp", "toggle"));
        expect(
            [...result.current.selection].sort((a, b) => a.localeCompare(b)),
        ).toEqual(["a.bp", "folder/b.bp"]);
    });

    it("rejects move into own child", async () => {
        const { result } = renderHook(() => useProjectExplorer());
        await act(async () => {});

        await expect(
            result.current.handleMove(["folder"], "folder"),
        ).rejects.toThrow();
        expect(vfsMock.movePaths).not.toHaveBeenCalled();
    });

    it("records snapshots for mutating operations", async () => {
        const { result } = renderHook(() => useProjectExplorer());
        await act(async () => {});

        await act(async () => {
            await result.current.handleCreateFile("", "new.bp", "file");
            await result.current.handleRename("a.bp", "renamed.bp");
            await result.current.handleDelete(["renamed.bp"]);
        });

        expect(historyMock.recordProjectSnapshot).toHaveBeenCalledTimes(3);
    });
});

