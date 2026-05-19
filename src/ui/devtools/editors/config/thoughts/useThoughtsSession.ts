import { useCallback } from "react";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";
import { useToastStore } from "../../../toast/toastStore";
import type { ThoughtDefinition } from "../../../../../data/schemas/thoughts";
import { THOUGHTS_PATH } from "./thoughtFieldSchemas";
import {
    EMPTY_THOUGHTS,
    getDraftThoughts,
    getNextThoughtId,
    renameThoughtAtIndex,
} from "./thoughtSessionHelpers";
import { createDefaultThought } from "./thoughtEditorDefaults";

export const useThoughtsSession = (filename: string) => {
    const thoughts = useSessionStore(
        useCallback(
            (state) =>
                (getByPath(
                    state.sessions[filename]?.draft,
                    THOUGHTS_PATH,
                ) as ThoughtDefinition[]) ?? EMPTY_THOUGHTS,
            [filename],
        ),
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const pushToast = useToastStore((state) => state.push);

    const updateThoughts = useCallback(
        (updater: (current: ThoughtDefinition[]) => ThoughtDefinition[]) => {
            updateDraft(filename, (draft) => {
                const current = getDraftThoughts(draft);
                setByPath(draft, THOUGHTS_PATH, updater(current));
            });
        },
        [filename, updateDraft],
    );

    const addThought = useCallback(() => {
        const next = getNextThoughtId(thoughts);
        updateThoughts((current) => [...current, createDefaultThought(next)]);
    }, [thoughts, updateThoughts]);

    const removeThought = useCallback(
        (index: number) =>
            updateThoughts((current) => current.filter((_, i) => i !== index)),
        [updateThoughts],
    );

    const renameThought = useCallback(
        (index: number, nextId: string): string | null => {
            const trimmed = nextId.trim();
            if (!trimmed) return "empty";
            if (
                thoughts.some(
                    (thought, i) => i !== index && thought.id === trimmed,
                )
            ) {
                pushToast("error", `ID "${trimmed}" already exists.`);
                return "duplicate";
            }
            updateThoughts((current) =>
                renameThoughtAtIndex(current, index, trimmed),
            );
            return null;
        },
        [thoughts, pushToast, updateThoughts],
    );

    return {
        thoughts,
        addThought,
        removeThought,
        renameThought,
    };
};
