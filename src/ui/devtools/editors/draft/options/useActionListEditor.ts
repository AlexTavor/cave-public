import { useCallback, useState } from "react";
import type { BehaviorAction } from "../../../../../data/schemas/behavior";
import { compileActionSequence } from "../../behaviors/compiler";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";

export const useActionListEditor = (filename: string, optionId: string) => {
    const payload = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return [] as BehaviorAction[];
                const path = `draftOptions.${optionId}.payload`;
                return (getByPath(session.draft, path) ??
                    []) as BehaviorAction[];
            },
            [filename, optionId],
        ),
    );

    const updateDraft = useSessionStore((state) => state.updateDraft);
    const [input, setInput] = useState("");
    const [error, setError] = useState<string | null>(null);

    const setPayload = useCallback(
        (next: BehaviorAction[]) => {
            updateDraft(filename, (draft) => {
                setByPath(draft, `draftOptions.${optionId}.payload`, next);
            });
        },
        [filename, optionId, updateDraft],
    );

    const addFromInput = useCallback(
        (value: string) => {
            try {
                const actions = compileActionSequence(value);
                setPayload([...payload, ...actions]);
                setInput("");
                setError(null);
            } catch (e: unknown) {
                setError((e as Error).message);
            }
        },
        [payload, setPayload],
    );

    const removeAction = useCallback(
        (index: number) => {
            const next = payload.filter((_, i) => i !== index);
            setPayload(next);
        },
        [payload, setPayload],
    );

    return {
        payload,
        input,
        setInput,
        addFromInput,
        removeAction,
        error,
    };
};
