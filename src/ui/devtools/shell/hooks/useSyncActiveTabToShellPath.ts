import { useEffect, useRef } from "react";
import { useLayoutStore } from "../../state/useLayoutStore";
import { useShellStore } from "../shell";
import { tabIdToVirtualPath } from "../window-manager/tabIdToVirtualPath";

export const useSyncActiveTabToShellPath = (): void => {
    const activeTabId = useLayoutStore((s) => s.activeTabId);
    const activeFilePath = useShellStore((s) => s.activeFilePath);
    const openFile = useShellStore((s) => s.openFile);
    const setActiveFileTabPath = useShellStore((s) => s.setActiveFileTabPath);
    const previousTabIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!activeTabId) {
            previousTabIdRef.current = null;
            return;
        }
        if (previousTabIdRef.current === activeTabId) return;
        previousTabIdRef.current = activeTabId;

        const path = tabIdToVirtualPath(activeTabId);
        if (!path) return;

        if (activeFilePath === path) return;

        if (activeTabId.startsWith("file:")) {
            setActiveFileTabPath(path);
        } else {
            openFile(path);
        }
    }, [activeFilePath, activeTabId, openFile, setActiveFileTabPath]);
};

