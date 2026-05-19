import React, { useCallback, useMemo, useState } from "react";
import { useToastStore } from "../toast/toastStore";
import type { useProjectExplorer } from "./useProjectExplorer";

export type MenuState = { x: number; y: number; path: string } | null;
type Explorer = ReturnType<typeof useProjectExplorer>;

export function useProjectExplorerActions(
    explorer: Explorer,
    onOpenFile?: (path: string) => void,
) {
    const [menu, setMenu] = useState<MenuState>(null);
    const pushToast = useToastStore((s) => s.push);

    const selectedPaths = useMemo(() => {
        if (!menu) return [];
        return explorer.selection.has(menu.path)
            ? [...explorer.selection]
            : [menu.path];
    }, [explorer.selection, menu]);

    const handleSelect = useCallback(
        (path: string, event: React.MouseEvent) => {
            if (event.shiftKey) return explorer.handleSelect(path, "range");
            if (event.ctrlKey || event.metaKey)
                return explorer.handleSelect(path, "toggle");
            explorer.handleSelect(path, "add");
        },
        [explorer],
    );

    const handleDropTo = useCallback(
        (targetPath: string, event: React.DragEvent) => {
            event.preventDefault();
            const source = event.dataTransfer.getData("text/plain");
            if (!source) return;
            void explorer
                .handleMove([source], targetPath)
                .then(() => pushToast("success", `Moved ${source}`))
                .catch((e: unknown) => {
                    pushToast(
                        "error",
                        e instanceof Error ? e.message : "Move failed.",
                    );
                });
        },
        [explorer, pushToast],
    );

    const handleContextMenu = useCallback(
        (path: string, e: React.MouseEvent) => {
            e.preventDefault();
            setMenu({ x: e.clientX, y: e.clientY, path });
        },
        [],
    );

    const handleCloseMenu = useCallback(() => setMenu(null), []);

    const handleRename = useCallback(() => {
        if (!menu) return;
        const next = globalThis.prompt(
            "Rename to",
            menu.path.split("/").pop() ?? "",
        );
        if (next) {
            void explorer
                .handleRename(menu.path, next)
                .then(() => pushToast("success", `Renamed to ${next}`));
        }
        setMenu(null);
    }, [explorer, menu, pushToast]);

    const handleDelete = useCallback(() => {
        void explorer.handleDelete(selectedPaths).then(() => {
            pushToast("info", `Deleted ${selectedPaths.length} item(s)`);
        });
        setMenu(null);
    }, [explorer, pushToast, selectedPaths]);

    const handleNewFile = useCallback(() => {
        if (!menu) return;
        const name = globalThis.prompt("File name");
        if (name) {
            void explorer
                .handleCreateFile(menu.path, name, "file")
                .then((path) => {
                    pushToast("success", `Created file ${name}`);
                    if (path?.toLowerCase().endsWith(".bp")) {
                        onOpenFile?.(path);
                    }
                });
        }
        setMenu(null);
    }, [explorer, menu, onOpenFile, pushToast]);

    const handleNewFolder = useCallback(() => {
        if (!menu) return;
        const name = globalThis.prompt("Folder name");
        if (name) {
            void explorer
                .handleCreateFile(menu.path, name, "folder")
                .then(() => pushToast("success", `Created folder ${name}`));
        }
        setMenu(null);
    }, [explorer, menu, pushToast]);

    return {
        menu,
        selectedPaths,
        handleSelect,
        handleDropTo,
        handleContextMenu,
        handleCloseMenu,
        handleRename,
        handleDelete,
        handleNewFile,
        handleNewFolder,
    };
}

