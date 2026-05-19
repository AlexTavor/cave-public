import { useMemo } from "react";
import { useSessionStore } from "../../../../state/useSessionStore";
import { useModuleStore } from "../../../../state/moduleStore";
import { useShellStore } from "../../../../shell/shell";
import { useBlueprintContext } from "../../BlueprintContext";

export const useDeleteModal = () => {
    const { filename, blueprintId, scopeId } = useBlueprintContext();

    // Selectors
    const isOpen = useSessionStore(
        (s) => s.sessions[filename]?.ui?.[scopeId]?.isDeleteOpen ?? false,
    );

    // Actions
    const updateSessionUi = useSessionStore((s) => s.updateSessionUi);
    const { computeDeleteImpact, deleteBlueprint } = useModuleStore();
    const { openFile } = useShellStore();

    // Derived State
    const deleteImpact = useMemo(() => {
        if (!isOpen || !filename || !blueprintId) return [];
        return computeDeleteImpact({ filename, blueprintId });
    }, [isOpen, filename, blueprintId, computeDeleteImpact]);

    const close = () => {
        updateSessionUi(filename, scopeId, (ui) => {
            ui.isDeleteOpen = false;
        });
    };

    const confirmDelete = async () => {
        await deleteBlueprint({ filename, blueprintId });
        close();
    };

    const handleOpenFile = (targetId: string) => {
        openFile(`${filename}::blueprints::${targetId}`);
    };

    return {
        isOpen,
        deleteImpact,
        filename,
        close,
        confirmDelete,
        handleOpenFile,
    };
};
