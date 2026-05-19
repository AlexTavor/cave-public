import { useCallback, useEffect, useMemo } from "react";
import { useModuleStore } from "../../../state/moduleStore";
import { useModuleSession } from "../../../state/moduleSession/useModuleSession";
import { useSessionStore } from "../../../state/useSessionStore";
import { useShellStore } from "../../../shell/shell";
import { useTerminalStore } from "../../../state/useTerminalStore";

export const useDraftPoolListPanel = (filename: string) => {
    const loadModule = useModuleStore((s) => s.loadModule);
    const moduleData = useModuleStore((s) => s.modules[filename] ?? null);
    const loading = useModuleStore((s) => s.loading[filename] ?? false);

    const createDraftPool = useModuleStore((s) => s.createDraftPool);
    const deleteDraftPool = useModuleStore((s) => s.deleteDraftPool);

    const updateDraft = useSessionStore((s) => s.updateDraft);

    const session = useModuleSession(filename);
    const pools = moduleData?.draftPools ?? {};

    const openFile = useShellStore((s) => s.openFile);
    const addLog = useTerminalStore((s) => s.addLog);

    useEffect(() => {
        if (!moduleData) loadModule(filename);
    }, [filename, loadModule, moduleData]);

    const handleCreate = useCallback(async () => {
        try {
            const id = await createDraftPool({ filename });
            const mod = useModuleStore.getState().modules[filename];
            const pool = mod?.draftPools?.[id];
            if (pool) {
                updateDraft(filename, (draft) => {
                    draft.draftPools ??= {};
                    draft.draftPools[id] = { ...pool };
                });
            }
            addLog({ type: "success", content: `Created draft pool '${id}'` });
            openFile(`pool::${filename}::${id}`);
        } catch (e: unknown) {
            addLog({
                type: "error",
                content: "Creation failed: " + (e as Error).message,
            });
        }
    }, [createDraftPool, filename, addLog, openFile, updateDraft]);

    const handleDelete = useCallback(
        async (poolId: string) => {
            try {
                await deleteDraftPool({ filename, poolId });
                updateDraft(filename, (draft) => {
                    if (draft.draftPools?.[poolId]) {
                        delete draft.draftPools[poolId];
                    }
                });
                addLog({
                    type: "success",
                    content: `Deleted draft pool '${poolId}'`,
                });
            } catch (e: unknown) {
                addLog({
                    type: "error",
                    content: "Delete failed: " + (e as Error).message,
                });
            }
        },
        [deleteDraftPool, filename, addLog, updateDraft],
    );

    const handleOpen = useCallback(
        (poolId: string) => {
            openFile(`pool::${filename}::${poolId}`);
        },
        [filename, openFile],
    );

    const poolIds = useMemo(
        () => Object.keys(pools).sort((a, b) => a.localeCompare(b)),
        [pools],
    );

    const title = moduleData?.metadata?.name || filename;
    const version = moduleData?.metadata?.version || "0.0.0";
    const hasError = !loading && !moduleData;

    return {
        title,
        version,
        isLoading: loading || !session.isReady,
        hasError,
        poolIds,
        onCreate: handleCreate,
        onDelete: handleDelete,
        onOpen: handleOpen,
    };
};
