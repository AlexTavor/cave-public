import { useCallback } from "react";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";
import { useToastStore } from "../../../toast/toastStore";
import type { TutorialDefinition } from "../../../../../data/schemas/tutorials";
import { TUTORIALS_PATH } from "./tutorialFieldSchemas";
import {
    EMPTY_TUTORIALS,
    getDraftTutorials,
    getNextTutorialId,
    renameTutorialAtIndex,
} from "./tutorialSessionHelpers";
import { createDefaultTutorial } from "./tutorialEditorDefaults";

export const useTutorialsSession = (filename: string) => {
    const tutorials = useSessionStore(
        useCallback(
            (state) =>
                (getByPath(
                    state.sessions[filename]?.draft,
                    TUTORIALS_PATH,
                ) as TutorialDefinition[]) ?? EMPTY_TUTORIALS,
            [filename],
        ),
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const pushToast = useToastStore((state) => state.push);

    const updateTutorials = useCallback(
        (updater: (current: TutorialDefinition[]) => TutorialDefinition[]) => {
            updateDraft(filename, (draft) => {
                setByPath(
                    draft,
                    TUTORIALS_PATH,
                    updater(getDraftTutorials(draft)),
                );
            });
        },
        [filename, updateDraft],
    );

    const addTutorial = useCallback(() => {
        const next = getNextTutorialId(tutorials);
        updateTutorials((current) => [...current, createDefaultTutorial(next)]);
    }, [tutorials, updateTutorials]);

    const removeTutorial = useCallback(
        (index: number) =>
            updateTutorials((current) => current.filter((_, i) => i !== index)),
        [updateTutorials],
    );

    const renameTutorial = useCallback(
        (index: number, nextId: string): string | null => {
            const trimmed = nextId.trim();
            if (!trimmed) return "empty";
            if (
                tutorials.some(
                    (tutorial, i) => i !== index && tutorial.id === trimmed,
                )
            ) {
                pushToast("error", `ID "${trimmed}" already exists.`);
                return "duplicate";
            }
            updateTutorials((current) =>
                renameTutorialAtIndex(current, index, trimmed),
            );
            return null;
        },
        [tutorials, pushToast, updateTutorials],
    );

    return { tutorials, addTutorial, removeTutorial, renameTutorial };
};
