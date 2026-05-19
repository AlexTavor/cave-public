import { useCallback } from "react";
import { useExplorerStore } from "../state/explorerStore";
import { useShellStore } from "../../../../shell/shell";
import { useModuleStore } from "../../../../state/moduleStore";
import { useTerminalStore } from "../../../../state/useTerminalStore";
import { LogType } from "../../../../../../lib/terminal";

export const useBlueprintActions = (params: {
    filename: string;
    sessionId: string;
}) => {
    const { filename, sessionId } = params;
    const { openFile } = useShellStore();
    const { addLog } = useTerminalStore();
    const log = (type: LogType, content: string) => addLog({ type, content });

    const createBlueprint = useModuleStore((s) => s.createBlueprint);
    const duplicateBlueprint = useModuleStore((s) => s.duplicateBlueprint);
    const computeDeleteImpact = useModuleStore((s) => s.computeDeleteImpact);

    const openDeleteBlueprint = useExplorerStore(
        (s) => s.actions.openDeleteBlueprint,
    );

    const handleOpenBlueprint = useCallback(
        (id: string) => {
            openFile(`${filename}::blueprints::${id}`);
        },
        [filename, openFile],
    );

    const handleOpenSettings = useCallback(() => {
        openFile(`meta::${filename}`);
    }, [filename, openFile]);

    const handleCreateOptimistic = useCallback(async () => {
        try {
            const newId = await createBlueprint({ filename });
            log("success", `Created blueprint '${newId}'`);
            handleOpenBlueprint(newId);
        } catch (e: unknown) {
            log("error", "Creation failed: " + (e as Error).message);
        }
    }, [filename, createBlueprint, log, handleOpenBlueprint]);

    const handleDuplicate = useCallback(
        async (id: string) => {
            try {
                const newId = await duplicateBlueprint({
                    filename,
                    blueprintId: id,
                });
                log("success", `Duplicated to '${newId}'`);
                handleOpenBlueprint(newId);
            } catch (e: unknown) {
                log("error", "Duplicate failed: " + (e as Error).message);
            }
        },
        [filename, duplicateBlueprint, log, handleOpenBlueprint],
    );

    const onDelete = useCallback(
        (id: string) => {
            const impact = computeDeleteImpact({ filename, blueprintId: id });
            openDeleteBlueprint(sessionId, id, impact);
        },
        [filename, computeDeleteImpact, openDeleteBlueprint, sessionId],
    );

    return {
        handleOpenSettings,
        handleOpenBlueprint,
        handleCreateOptimistic,
        handleDuplicate,
        onDelete,
    };
};
