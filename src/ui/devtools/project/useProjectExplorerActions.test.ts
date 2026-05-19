// @vitest-environment jsdom
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectExplorerActions } from "./useProjectExplorerActions";

const pushToast = vi.fn();
vi.mock("../toast/toastStore", () => ({
    useToastStore: (sel: (s: { push: typeof pushToast }) => unknown) =>
        sel({ push: pushToast }),
}));

const makeExplorer = () => ({
    tree: { name: ".", path: "", type: "directory" as const, children: [] },
    selection: new Set<string>(),
    expanded: new Set<string>(),
    handleSelect: vi.fn(),
    handleToggleFolder: vi.fn(),
    handleMove: vi.fn(async () => undefined),
    handleDelete: vi.fn(async () => undefined),
    handleRename: vi.fn(async () => undefined),
    handleCreateFile: vi.fn(async () => "new.bp"),
});

const mouse = (o: Record<string, unknown> = {}): React.MouseEvent =>
    ({
        preventDefault: vi.fn(),
        clientX: 0,
        clientY: 0,
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        ...o,
    }) as unknown as React.MouseEvent;

const drag = (source: string): React.DragEvent =>
    ({
        preventDefault: vi.fn(),
        dataTransfer: { getData: vi.fn(() => source) },
    }) as unknown as React.DragEvent;

describe("useProjectExplorerActions", () => {
    let explorer: ReturnType<typeof makeExplorer>;
    let result: { current: ReturnType<typeof useProjectExplorerActions> };
    let onOpenFile: (path: string) => void;

    beforeEach(() => {
        vi.clearAllMocks();
        explorer = makeExplorer();
        onOpenFile = vi.fn<(path: string) => void>();
        ({ result } = renderHook(() =>
            useProjectExplorerActions(explorer, onOpenFile),
        ));
    });

    it("maps plain click to add selection", () => {
        act(() => result.current.handleSelect("a.bp", mouse()));
        expect(explorer.handleSelect).toHaveBeenCalledWith("a.bp", "add");
    });

    it("maps ctrl click to toggle selection", () => {
        act(() =>
            result.current.handleSelect("a.bp", mouse({ ctrlKey: true })),
        );
        expect(explorer.handleSelect).toHaveBeenCalledWith("a.bp", "toggle");
    });

    it("maps shift click to range selection", () => {
        act(() =>
            result.current.handleSelect("a.bp", mouse({ shiftKey: true })),
        );
        expect(explorer.handleSelect).toHaveBeenCalledWith("a.bp", "range");
    });

    it("calls handleMove on valid drop source", async () => {
        await act(async () =>
            result.current.handleDropTo("folder", drag("a.bp")),
        );
        expect(explorer.handleMove).toHaveBeenCalledWith(["a.bp"], "folder");
    });

    it("ignores drop with empty source data", () => {
        act(() => result.current.handleDropTo("folder", drag("")));
        expect(explorer.handleMove).not.toHaveBeenCalled();
    });

    it("calls handleRename on confirmed prompt", async () => {
        globalThis.prompt = vi.fn(() => "new-name");
        act(() => result.current.handleContextMenu("a.bp", mouse()));
        await act(async () => result.current.handleRename());
        expect(explorer.handleRename).toHaveBeenCalledWith("a.bp", "new-name");
    });

    it("skips rename when prompt is cancelled", () => {
        globalThis.prompt = vi.fn(() => null);
        act(() => result.current.handleContextMenu("a.bp", mouse()));
        act(() => result.current.handleRename());
        expect(explorer.handleRename).not.toHaveBeenCalled();
    });

    it("calls handleDelete with the menu-resolved paths", async () => {
        act(() => result.current.handleContextMenu("a.bp", mouse()));
        await act(async () => result.current.handleDelete());
        expect(explorer.handleDelete).toHaveBeenCalledWith(["a.bp"]);
    });

    it("opens newly created blueprint files", async () => {
        globalThis.prompt = vi.fn(() => "new.bp");
        act(() => result.current.handleContextMenu("folder", mouse()));
        await act(async () => result.current.handleNewFile());
        expect(explorer.handleCreateFile).toHaveBeenCalledWith(
            "folder",
            "new.bp",
            "file",
        );
        expect(onOpenFile).toHaveBeenCalledWith("new.bp");
    });
});

