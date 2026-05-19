import { useEffect, useMemo } from "react";
import { useModuleStore } from "../../../../state/moduleStore";
import { useShellStore } from "../../../../shell/shell";

export interface ModuleExplorerViewState {
    title: string;
    version: string;
    isLoading: boolean;
    hasError: boolean;
    openSettings: () => void;
    openPhysics: () => void;
    openBlueprints: () => void;
    openDisplays: () => void;
    openDraftOptions: () => void;
    openDraftPools: () => void;
}

export function useModuleExplorer(params: {
    filename: string;
}): ModuleExplorerViewState {
    const { filename } = params;

    const loadModule = useModuleStore((s) => s.loadModule);
    const moduleData = useModuleStore((s) => s.modules[filename] ?? null);
    const loading = useModuleStore((s) => s.loading[filename] ?? false);

    const { openFile } = useShellStore();

    useEffect(() => {
        loadModule(filename);
    }, [filename, loadModule]);

    const hasError = !loading && !moduleData;

    const title = moduleData?.metadata?.name || filename;
    const version = moduleData?.metadata?.version || "0.0.0";

    return useMemo(
        () => ({
            title,
            version,
            isLoading: loading,
            hasError,
            openSettings: () => openFile(`meta::${filename}`),
            openPhysics: () => openFile(`physics::${filename}`),
            openBlueprints: () => openFile(`list::${filename}::blueprints`),
            openDraftOptions: () => openFile(`options::${filename}`),
            openDraftPools: () => openFile(`list::${filename}::draft_pools`),
            openDisplays: () => openFile(`list::${filename}::assets::displays`),
        }),
        [title, version, loading, hasError, filename, openFile],
    );
}

