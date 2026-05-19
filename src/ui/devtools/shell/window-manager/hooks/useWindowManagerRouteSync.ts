import { useEffect, useMemo, useRef } from "react";
import { parseVirtualPath } from "../virtualPath";
import { useModuleSessionLoader } from "../../../state/moduleSession";
import { createRouteHandlers } from "./useWindowManagerRouteHandlers";
import type { GetLabel, OpenTab } from "./useWindowManagerRouteHandlers.types";

type UseWindowManagerRouteSyncParams = {
    activeFilePath: string | null;
    openTab: OpenTab;
    getLabel: GetLabel;
    initExplorerSession: (sessionId: string) => void;
};

export function useWindowManagerRouteSync({
    activeFilePath,
    openTab,
    getLabel,
    initExplorerSession,
}: UseWindowManagerRouteSyncParams): void {
    const ensureModuleSession = useModuleSessionLoader();
    const lastHandledPathRef = useRef<string | null>(null);
    const handlers = useMemo(
        () =>
            createRouteHandlers({
                openTab,
                getLabel,
                initExplorerSession,
                ensureModuleSession,
            }),
        [ensureModuleSession, getLabel, initExplorerSession, openTab],
    );

    useEffect(() => {
        if (!activeFilePath) return;
        if (!activeFilePath.includes("::")) return;
        if (activeFilePath === lastHandledPathRef.current) return;
        const parsed = parseVirtualPath(activeFilePath);
        lastHandledPathRef.current = activeFilePath;
        const handler = handlers[parsed.kind];
        handler?.(parsed);
    }, [activeFilePath, handlers]);
}
