import { useCallback } from "react";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import type { UnderstandingDefinition } from "../../../../../data/schemas/game/understanding";
import { useEnsureModuleSession } from "../../../state/moduleSession";
import { useSessionStore } from "../../../state/useSessionStore";
import { createDefaultUnderstanding } from "./understandingEditorDefaults";
import { UNDERSTANDING_PATH } from "./understandingPaths";

const EMPTY_UNDERSTANDING: Record<string, UnderstandingDefinition> = {};

export const useUnderstandingConfigSession = (filename: string) => {
    useEnsureModuleSession(filename);
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const understandingIndex = useSessionStore(
        useCallback(
            (state) =>
                (getByPath(
                    state.sessions[filename]?.draft,
                    UNDERSTANDING_PATH,
                ) as Record<string, UnderstandingDefinition>) ??
                EMPTY_UNDERSTANDING,
            [filename],
        ),
    );
    return {
        understandingIndex,
        understandingIds: Object.keys(understandingIndex),
        addUnderstanding: () => {
            const id = `understanding-${Date.now().toString(36)}`;
            updateDraft(filename, (draft) =>
                setByPath(draft, UNDERSTANDING_PATH, {
                    ...understandingIndex,
                    [id]: createDefaultUnderstanding(id),
                }),
            );
        },
        removeUnderstanding: (id: string) =>
            updateDraft(filename, (draft) => {
                const { [id]: _removed, ...nextIndex } = understandingIndex;
                setByPath(draft, UNDERSTANDING_PATH, nextIndex);
            }),
        renameUnderstanding: (oldId: string, newId: string) => {
            const id = newId.trim();
            if (!id) return "empty";
            if (id !== oldId && understandingIndex[id]) return "duplicate";
            updateDraft(filename, (draft) => {
                const { [oldId]: current, ...rest } = understandingIndex;
                setByPath(draft, UNDERSTANDING_PATH, {
                    ...rest,
                    [id]: { ...current, id },
                });
            });
            return null;
        },
    };
};
