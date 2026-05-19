import { useCallback } from "react";
import type { StructuredCondition } from "../../../../data/schemas/conditions";
import { useSessionStore } from "../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../utils/objectUtils";
import { createDefaultStructuredCondition } from "./structuredConditionDefaults";

const EMPTY_ITEMS: StructuredCondition[] = [];

export const useStructuredConditionsField = (
    filename: string,
    path: string,
) => {
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const items = useSessionStore(
        useCallback(
            (state) => {
                const value = getByPath(state.sessions[filename]?.draft, path);
                return Array.isArray(value)
                    ? (value as StructuredCondition[])
                    : EMPTY_ITEMS;
            },
            [filename, path],
        ),
    );
    const add = useCallback(() => {
        updateDraft(filename, (draft) => {
            const current = getByPath(draft, path);
            if (Array.isArray(current))
                return current.push(createDefaultStructuredCondition());
            setByPath(draft, path, [createDefaultStructuredCondition()]);
        });
    }, [filename, path, updateDraft]);
    const remove = useCallback(
        (index: number) => {
            updateDraft(filename, (draft) => {
                const current = getByPath(draft, path);
                if (Array.isArray(current)) current.splice(index, 1);
            });
        },
        [filename, path, updateDraft],
    );
    const setKind = useCallback(
        (index: number, kind: StructuredCondition["kind"]) => {
            updateDraft(filename, (draft) => {
                const current = getByPath(draft, path);
                if (!Array.isArray(current)) return;
                current[index] = createDefaultStructuredCondition(kind);
            });
        },
        [filename, path, updateDraft],
    );
    return { items, add, remove, setKind };
};
