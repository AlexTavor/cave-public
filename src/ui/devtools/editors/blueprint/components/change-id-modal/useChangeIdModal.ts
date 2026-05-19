import { useState, useMemo } from "react";
import { useSessionStore } from "../../../../state/useSessionStore";
import { useBlueprintContext } from "../../BlueprintContext";

export const useChangeIdModal = () => {
    const { filename, blueprintId, scopeId } = useBlueprintContext();
    const isOpen = useSessionStore(
        (s) => s.sessions[filename]?.ui?.[scopeId]?.isChangeIdOpen ?? false,
    );
    const updateDraft = useSessionStore((s) => s.updateDraft);
    const updateSessionUi = useSessionStore((s) => s.updateSessionUi);
    const blueprints = useSessionStore(
        (s) => s.sessions[filename]?.draft?.blueprints,
    );

    const [idDraft, setIdDraft] = useState(blueprintId);

    const close = () => {
        updateSessionUi(filename, scopeId, (ui) => {
            ui.isChangeIdOpen = false;
        });
        setIdDraft(blueprintId);
    };

    const validationError = useMemo(() => {
        const candidate = idDraft.trim();
        if (!candidate) return "ID cannot be empty.";
        if (candidate === blueprintId) return null;
        if (!/^[a-z0-9_]+$/.test(candidate))
            return "Only lowercase letters, digits, underscores.";
        if (blueprints && candidate in blueprints) return "ID already exists.";
        return null;
    }, [idDraft, blueprintId, blueprints]);

    const confirm = () => {
        const candidate = idDraft.trim();
        if (validationError || candidate === blueprintId) return;
        updateDraft(filename, (draft) => {
            const bp = draft.blueprints[blueprintId];
            if (!bp) return;
            bp.id = candidate;
            draft.blueprints[candidate] = bp;
            delete draft.blueprints[blueprintId];
        });
        close();
    };

    return {
        isOpen,
        idDraft,
        setIdDraft,
        validationError,
        canConfirm: !validationError && idDraft.trim() !== blueprintId,
        close,
        confirm,
    };
};
