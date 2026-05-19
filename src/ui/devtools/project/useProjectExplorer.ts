import { useCallback, useEffect, useRef, useState } from "react";
import { vfs } from "../../../engine/vfs/FileSystem";
import type { TreeNode } from "../../../engine/vfs/types";
import {
    createExplorerPath,
    deleteExplorerPaths,
    moveExplorerPaths,
    renameExplorerPath,
} from "./projectExplorerOps";
import {
    loadProjectExplorerUiState,
    saveProjectExplorerUiState,
} from "./projectExplorerUiState";
import { nextSelection, toggleExpandedPath } from "./projectExplorerSelection";

export function useProjectExplorer() {
    const initialUiState = useRef(loadProjectExplorerUiState()).current;
    const [tree, setTree] = useState<TreeNode>({
        name: ".",
        path: "",
        type: "directory",
        children: [],
    });
    const [selection, setSelection] = useState(
        () => new Set(initialUiState.selection),
    );
    const [expanded, setExpanded] = useState(
        () => new Set(initialUiState.expanded),
    );
    const anchorPathRef = useRef<string | null>(initialUiState.anchorPath);

    const refresh = useCallback(async () => {
        setTree(await vfs.tree(""));
    }, []);

    useEffect(() => {
        void refresh();
        const timer = globalThis.setInterval(() => void refresh(), 1000);
        return () => globalThis.clearInterval(timer);
    }, [refresh]);

    useEffect(() => {
        saveProjectExplorerUiState({
            selection: [...selection],
            expanded: [...expanded],
            anchorPath: anchorPathRef.current,
        });
    }, [expanded, selection]);

    const handleSelect = useCallback(
        (path: string, modifier: "add" | "toggle" | "range") => {
            const anchor = anchorPathRef.current;
            if (modifier !== "range") anchorPathRef.current = path;
            setSelection((prev) =>
                nextSelection(path, modifier, prev, tree, expanded, anchor),
            );
        },
        [expanded, tree],
    );

    const handleToggleFolder = useCallback((path: string) => {
        setExpanded((prev) => toggleExpandedPath(path, prev));
    }, []);

    const handleMove = useCallback(
        async (sourcePaths: string[], targetPath: string) => {
            await moveExplorerPaths(tree, sourcePaths, targetPath);
            await refresh();
        },
        [refresh, tree],
    );

    const handleDelete = useCallback(
        async (paths: string[]) => {
            await deleteExplorerPaths(paths);
            setSelection(new Set());
            await refresh();
        },
        [refresh],
    );

    const handleRename = useCallback(
        async (path: string, newName: string) => {
            await renameExplorerPath(path, newName);
            await refresh();
        },
        [refresh],
    );

    const handleCreateFile = useCallback(
        async (parentPath: string, name: string, type: "folder" | "file") => {
            const path = await createExplorerPath(parentPath, name, type);
            await refresh();
            return path;
        },
        [refresh],
    );

    return {
        tree,
        selection,
        expanded,
        handleSelect,
        handleToggleFolder,
        handleMove,
        handleDelete,
        handleRename,
        handleCreateFile,
    };
}

