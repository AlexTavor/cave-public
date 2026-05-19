import { useCallback } from "react";
import { useSessionStore } from "../../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";

export const useInjectionAbilityList = (filename: string, basePath: string) => {
    const updateDraft = useSessionStore((state) => state.updateDraft);

    const injections = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return [];
                const value = getByPath(session.draft, basePath);
                return Array.isArray(value) ? value : [];
            },
            [basePath, filename],
        ),
    );

    const addInjection = useCallback(() => {
        updateDraft(filename, (draft) => {
            const current = getByPath(draft, basePath);
            const nextItem = { targetTag: "", effects: [] };
            if (Array.isArray(current)) {
                current.push(nextItem);
                return;
            }
            setByPath(draft, basePath, [nextItem]);
        });
    }, [basePath, filename, updateDraft]);

    const removeInjection = useCallback(
        (index: number) => {
            updateDraft(filename, (draft) => {
                const current = getByPath(draft, basePath);
                if (!Array.isArray(current)) return;
                current.splice(index, 1);
            });
        },
        [basePath, filename, updateDraft],
    );

    return {
        injections,
        addInjection,
        removeInjection,
    };
};
