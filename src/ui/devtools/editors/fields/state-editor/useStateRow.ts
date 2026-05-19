import { useCallback, useEffect, useMemo, useState } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { useBlueprintContext } from "../../blueprint/BlueprintContext";

const ensureStateEntry = (draft: any, key: string, value: number): void => {
    draft.components ??= {};
    draft.components.state ??= {};

    const state = draft.components.state as Record<string, any>;
    const entry = state[key];

    if (!entry || typeof entry !== "object") {
        state[key] = { value, visible: true };
        return;
    }

    entry.value = value;
};

export const useStateRow = (params: { entryKey: string; value: number }) => {
    const { entryKey, value } = params;
    const { filename, blueprintId } = useBlueprintContext();
    const updateDraft = useSessionStore((s) => s.updateDraft);
    const [draftValue, setDraftValue] = useState(String(value));

    useEffect(() => {
        setDraftValue(String(value));
    }, [value]);

    const numericValue = useMemo(() => Number(draftValue), [draftValue]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!Number.isFinite(numericValue)) return;
            if (numericValue === value) return;

            updateDraft(filename, (moduleDraft) => {
                const blueprint = moduleDraft.blueprints[blueprintId];
                if (!blueprint) return;
                ensureStateEntry(blueprint, entryKey, numericValue);
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [numericValue, value, entryKey, filename, blueprintId, updateDraft]);

    const removeEntry = useCallback(() => {
        updateDraft(filename, (moduleDraft) => {
            const blueprint = moduleDraft.blueprints[blueprintId];
            if (!blueprint) return;
            const state =
                (
                    blueprint as {
                        components?: { state?: Record<string, unknown> };
                    }
                ).components?.state ?? undefined;
            if (!state || typeof state !== "object") return;
            delete state[entryKey];
        });
    }, [entryKey, filename, blueprintId, updateDraft]);

    return {
        draftValue,
        setDraftValue,
        removeEntry,
    };
};
