import { useEffect, useMemo } from "react";
import { useModuleStore } from "../../../../state/moduleStore";
import { useExplorerStore } from "../state/explorerStore";

export interface ExplorerListPanelState {
    title: string;
    version: string;
    isLoading: boolean;
    hasError: boolean;
}

export function useExplorerListPanel(params: {
    filename: string;
    sessionId: string;
}): ExplorerListPanelState {
    const { filename, sessionId } = params;

    const loadModule = useModuleStore((s) => s.loadModule);
    const moduleData = useModuleStore((s) => s.modules[filename] ?? null);
    const loading = useModuleStore((s) => s.loading[filename] ?? false);

    const initSession = useExplorerStore((s) => s.actions.initSession);
    const session = useExplorerStore((s) => s.sessions[sessionId]);

    useEffect(() => {
        loadModule(filename);
        initSession(sessionId);
    }, [filename, loadModule, initSession, sessionId]);

    const hasError = !loading && (!moduleData || !session);
    const title = moduleData?.metadata?.name || filename;
    const version = moduleData?.metadata?.version || "0.0.0";

    return useMemo(
        () => ({
            title,
            version,
            isLoading: loading,
            hasError,
        }),
        [title, version, loading, hasError],
    );
}
