import { useCallback, useMemo, useState } from "react";
import { Op } from "../../../../../../data/schemas/primitives";
import { useSessionStore } from "../../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";

const createEffectDraft = () => ({
    op: Op.ADD,
    target: "",
    value: 0,
});

export const useInjectionEffects = (filename: string, basePath: string) => {
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const effectsPath = useMemo(() => `${basePath}.effects`, [basePath]);
    const [isOpen, setIsOpen] = useState(true);

    const effects = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return [];
                const value = getByPath(session.draft, effectsPath);
                return Array.isArray(value) ? value : [];
            },
            [effectsPath, filename],
        ),
    );

    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    const addEffect = useCallback(() => {
        updateDraft(filename, (draft) => {
            const current = getByPath(draft, effectsPath);
            const nextItem = createEffectDraft();
            if (Array.isArray(current)) {
                current.push(nextItem);
                return;
            }
            setByPath(draft, effectsPath, [nextItem]);
        });
    }, [effectsPath, filename, updateDraft]);

    const removeEffect = useCallback(
        (index: number) => {
            updateDraft(filename, (draft) => {
                const current = getByPath(draft, effectsPath);
                if (!Array.isArray(current)) return;
                current.splice(index, 1);
            });
        },
        [effectsPath, filename, updateDraft],
    );

    return {
        effects,
        isOpen,
        toggle,
        addEffect,
        removeEffect,
    };
};
