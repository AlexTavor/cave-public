import { useCallback } from "react";
import { useSessionStore } from "../../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";

const EMPTY_ITEMS: unknown[] = [];

export const useSimpleArrayField = <T>(
    filename: string,
    path: string,
    createItem: () => T,
) => {
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const items = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return EMPTY_ITEMS as T[];
                const value = getByPath(session.draft, path);
                return Array.isArray(value)
                    ? (value as T[])
                    : (EMPTY_ITEMS as T[]);
            },
            [filename, path],
        ),
    );

    const add = () => {
        updateDraft(filename, (draft) => {
            const current = getByPath(draft, path);
            const nextItem = createItem();
            if (Array.isArray(current)) {
                (current as T[]).push(nextItem);
                return;
            }
            setByPath(draft, path, [nextItem]);
        });
    };

    const remove = (index: number) => {
        updateDraft(filename, (draft) => {
            const current = getByPath(draft, path);
            if (!Array.isArray(current)) return;
            (current as T[]).splice(index, 1);
        });
    };

    return { items, add, remove };
};
