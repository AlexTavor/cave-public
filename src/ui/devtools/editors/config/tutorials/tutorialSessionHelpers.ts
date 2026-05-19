import type { TutorialDefinition } from "../../../../../data/schemas/tutorials";
import { getByPath } from "../../../../../utils/objectUtils";
import { TUTORIALS_PATH } from "./tutorialFieldSchemas";

export const EMPTY_TUTORIALS: TutorialDefinition[] = [];

export const getDraftTutorials = (draft: unknown): TutorialDefinition[] =>
    (
        (getByPath(draft, TUTORIALS_PATH) as TutorialDefinition[]) ??
        EMPTY_TUTORIALS
    ).slice();

export const getNextTutorialId = (tutorials: TutorialDefinition[]): string => {
    let next = `tutorial_${tutorials.length + 1}`;
    while (tutorials.some((tutorial) => tutorial.id === next)) {
        next = `${next}_new`;
    }
    return next;
};

export const renameTutorialAtIndex = (
    current: TutorialDefinition[],
    index: number,
    nextId: string,
) =>
    current.map((tutorial, i) =>
        i === index ? { ...tutorial, id: nextId } : tutorial,
    );
