import {
    RuntimeCommandType,
    type RuntimeCommand,
} from "../../../engine/runtime/types";

const STORAGE_KEY = "cave.tutorial-completion-memory";

type RuntimeWithTutorialFacts = {
    commands?: { enqueue: (command: RuntimeCommand) => void };
    getEntities?: () => ReadonlyArray<any>;
    getEntity?: (id: string) => any;
};

const getWorld = (runtime: RuntimeWithTutorialFacts | null | undefined) =>
    runtime?.getEntity?.("sys_world") ??
    runtime?.getEntities?.().find((entity) => entity?.id === "sys_world") ??
    null;

export const readStoredTutorialCompletionMemory = () => {
    try {
        return JSON.parse(
            globalThis.localStorage?.getItem(STORAGE_KEY) ?? "{}",
        );
    } catch {
        return {};
    }
};

export const persistTutorialCompletionMemory = (
    values: Record<string, number>,
): void => {
    const next = Object.fromEntries(
        Object.entries(values).filter(
            ([, value]) => Number.isFinite(value) && value > 0,
        ),
    );
    if (Object.keys(next).length === 0)
        return globalThis.localStorage?.removeItem(STORAGE_KEY);
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const extractTutorialCompletionMemory = (
    runtime: RuntimeWithTutorialFacts | null | undefined,
): Record<string, number> => {
    const values = getWorld(runtime)?.permanent?.tutorial_completed;
    return values ? { ...values } : readStoredTutorialCompletionMemory();
};

export const enqueueTutorialCompletionMemory = (
    runtime: RuntimeWithTutorialFacts | null | undefined,
    values: Record<string, number>,
): void => {
    Object.entries(values).forEach(([factAbout, delta]) => {
        if (!Number.isFinite(delta) || delta <= 0) return;
        runtime?.commands?.enqueue({
            type: RuntimeCommandType.ADJUST_FACT,
            payload: {
                scope: "permanent",
                factType: "tutorial_completed",
                factAbout,
                delta,
            },
        });
    });
};

export const clearTutorialCompletionMemory = (
    runtime: RuntimeWithTutorialFacts | null | undefined,
): void => {
    const values = extractTutorialCompletionMemory(runtime);
    persistTutorialCompletionMemory({});
    Object.entries(values).forEach(([factAbout, delta]) => {
        if (!Number.isFinite(delta) || delta <= 0) return;
        runtime?.commands?.enqueue({
            type: RuntimeCommandType.ADJUST_FACT,
            payload: {
                scope: "permanent",
                factType: "tutorial_completed",
                factAbout,
                delta: -delta,
            },
        });
    });
};

export const restoreTutorialCompletionMemory = (
    runtime: RuntimeWithTutorialFacts | null | undefined,
    values: Record<string, number>,
): void => {
    persistTutorialCompletionMemory(values);
    enqueueTutorialCompletionMemory(runtime, values);
    (
        runtime as { flushCommands?: () => void } | null | undefined
    )?.flushCommands?.();
};
