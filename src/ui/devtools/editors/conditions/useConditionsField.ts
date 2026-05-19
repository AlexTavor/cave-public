import { useCallback, useMemo } from "react";
import { compileConditionText } from "../../../../lib/logic/compileConditionText";
import { useSessionStore } from "../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../utils/objectUtils";

const EMPTY_ITEMS: string[] = [];

export interface ConditionsFieldState {
    items: string[];
    errors: Array<string | null>;
    add: () => void;
    remove: (index: number) => void;
    update: (index: number, value: string) => void;
}

export const useConditionsField = (
    filename: string,
    path: string,
): ConditionsFieldState => {
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const items = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return EMPTY_ITEMS;
                const value = getByPath(session.draft, path);
                return Array.isArray(value) ? (value as string[]) : EMPTY_ITEMS;
            },
            [filename, path],
        ),
    );

    const errors = useMemo(
        () =>
            items.map((line) => {
                if (!line?.trim()) return null;
                const result = compileConditionText(line);
                return result.ok ? null : result.error;
            }),
        [items],
    );

    const add = useCallback(() => {
        updateDraft(filename, (draft) => {
            const current = getByPath(draft, path);
            if (Array.isArray(current)) {
                (current as string[]).push("");
                return;
            }
            setByPath(draft, path, [""]);
        });
    }, [filename, path, updateDraft]);

    const remove = useCallback(
        (index: number) => {
            updateDraft(filename, (draft) => {
                const current = getByPath(draft, path);
                if (!Array.isArray(current)) return;
                (current as string[]).splice(index, 1);
            });
        },
        [filename, path, updateDraft],
    );

    const update = useCallback(
        (index: number, value: string) => {
            updateDraft(filename, (draft) => {
                const current = getByPath(draft, path);
                if (!Array.isArray(current)) {
                    setByPath(draft, path, []);
                }
                const next = getByPath(draft, path);
                if (!Array.isArray(next)) return;
                (next as string[])[index] = value;
            });
        },
        [filename, path, updateDraft],
    );

    return { items, errors, add, remove, update };
};
