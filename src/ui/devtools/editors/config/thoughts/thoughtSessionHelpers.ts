import type { ThoughtDefinition } from "../../../../../data/schemas/thoughts";
import { getByPath } from "../../../../../utils/objectUtils";
import { THOUGHTS_PATH } from "./thoughtFieldSchemas";

export const EMPTY_THOUGHTS: ThoughtDefinition[] = [];

export const getDraftThoughts = (draft: unknown): ThoughtDefinition[] =>
    (
        (getByPath(draft, THOUGHTS_PATH) as ThoughtDefinition[]) ??
        EMPTY_THOUGHTS
    ).slice();

export const getNextThoughtId = (thoughts: ThoughtDefinition[]): string => {
    let next = `thought_${thoughts.length + 1}`;
    while (thoughts.some((thought) => thought.id === next))
        next = `${next}_new`;
    return next;
};

export const renameThoughtAtIndex = (
    current: ThoughtDefinition[],
    index: number,
    nextId: string,
) =>
    current.map((thought, i) =>
        i === index ? { ...thought, id: nextId } : thought,
    );
