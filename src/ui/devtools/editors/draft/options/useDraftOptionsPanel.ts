import { useCallback, useEffect, useMemo } from "react";
import { useModuleStore } from "../../../state/moduleStore";
import { useModuleSession } from "../../../state/moduleSession/useModuleSession";
import { useSessionStore } from "../../../state/useSessionStore";
import { useTerminalStore } from "../../../state/useTerminalStore";
import { renameDraftOptionInSession } from "./renameDraftOptionInSession";

const EMPTY_OPTIONS: Record<string, { id: string }> = {};

export const useDraftOptionsPanel = (filename: string) => {
    const { addLog } = useTerminalStore();
    const log = (type: "success" | "error", content: string) =>
        addLog({ type, content });

    const loadModule = useModuleStore((s) => s.loadModule);
    const moduleData = useModuleStore((s) => s.modules[filename] ?? null);
    const loading = useModuleStore((s) => s.loading[filename] ?? false);

    const createDraftOption = useModuleStore((s) => s.createDraftOption);
    const deleteDraftOption = useModuleStore((s) => s.deleteDraftOption);

    const updateDraft = useSessionStore((s) => s.updateDraft);

    const session = useModuleSession(filename);
    const options =
        session.draft?.draftOptions ??
        moduleData?.draftOptions ??
        EMPTY_OPTIONS;

    useEffect(() => {
        loadModule(filename);
    }, [filename, loadModule]);

    const handleCreate = useCallback(async () => {
        try {
            const id = await createDraftOption({ filename });
            const mod = useModuleStore.getState().modules[filename];
            const opt = mod?.draftOptions?.[id];
            if (opt) {
                updateDraft(filename, (draft) => {
                    draft.draftOptions ??= {};
                    draft.draftOptions[id] = { ...opt };
                });
            }
            log("success", `Created draft option '${id}'`);
        } catch (e: unknown) {
            log("error", "Creation failed: " + (e as Error).message);
        }
    }, [createDraftOption, filename, log, updateDraft]);

    const handleDelete = useCallback(
        async (optionId: string) => {
            try {
                await deleteDraftOption({ filename, optionId });
                updateDraft(filename, (draft) => {
                    if (draft.draftOptions?.[optionId]) {
                        delete draft.draftOptions[optionId];
                    }
                });
                log("success", `Deleted draft option '${optionId}'`);
            } catch (e: unknown) {
                log("error", "Delete failed: " + (e as Error).message);
            }
        },
        [deleteDraftOption, filename, log, updateDraft],
    );

    const handleRename = useCallback(
        (oldId: string, newId: string): string | null => {
            const trimmed = newId.trim();
            let result: string | null = null;
            updateDraft(filename, (draft) => {
                result = renameDraftOptionInSession({
                    draft,
                    oldId,
                    newId: trimmed,
                });
            });
            if (!result && trimmed !== oldId) {
                log(
                    "success",
                    `Renamed draft option '${oldId}' to '${trimmed}'`,
                );
            }
            return result;
        },
        [filename, log, updateDraft],
    );

    const title = moduleData?.metadata?.name || filename;
    const version = moduleData?.metadata?.version || "0.0.0";
    const hasError = !loading && !moduleData;

    const items = useMemo(
        () => Object.keys(options).sort((a, b) => a.localeCompare(b)),
        [options],
    );

    return {
        title,
        version,
        isLoading: loading || !session.isReady,
        hasError,
        optionIds: items,
        onCreate: handleCreate,
        onDelete: handleDelete,
        onRename: handleRename,
    };
};
