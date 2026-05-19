import {
    RuntimeCommandType,
    type RuntimeCommand,
} from "../../../engine/runtime/types";

const STORAGE_KEY = "cave.tutorial-mode";

type RuntimeWithTutorialMode = {
    commands?: { enqueue: (command: RuntimeCommand) => void };
    flushCommands?: () => void;
    getEntities?: () => ReadonlyArray<any>;
    getEntity?: (id: string) => any;
};

const getWorld = (runtime: RuntimeWithTutorialMode | null | undefined) =>
    runtime?.getEntity?.("sys_world") ??
    runtime?.getEntities?.().find((entity) => entity?.id === "sys_world") ??
    null;

const normalizeTutorialMode = (value: unknown): 0 | 1 =>
    Number(value) >= 1 ? 1 : 0;

export const readTutorialModeValue = (world: any): 0 | 1 =>
    normalizeTutorialMode(world?.state?.tutorial_mode?.value ?? 1);

export const readStoredTutorialMode = (): 0 | 1 => {
    try {
        return normalizeTutorialMode(
            JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? "1"),
        );
    } catch {
        return 1;
    }
};

export const persistTutorialMode = (value: number): void => {
    globalThis.localStorage?.setItem(
        STORAGE_KEY,
        JSON.stringify(normalizeTutorialMode(value)),
    );
};

export const extractTutorialMode = (
    runtime: RuntimeWithTutorialMode | null | undefined,
): 0 | 1 => {
    const world = getWorld(runtime);
    return world?.state?.tutorial_mode
        ? readTutorialModeValue(world)
        : readStoredTutorialMode();
};

const enqueueTutorialMode = (
    runtime: RuntimeWithTutorialMode | null | undefined,
    value: 0 | 1,
): void => {
    runtime?.commands?.enqueue({
        type: RuntimeCommandType.UPDATE_STATE,
        payload: {
            entityId: "sys_world",
            key: "tutorial_mode",
            value,
            visible: false,
        },
    });
};

export const restoreTutorialMode = (
    runtime: RuntimeWithTutorialMode | null | undefined,
    value: number,
): void => {
    const next = normalizeTutorialMode(value);
    persistTutorialMode(next);
    enqueueTutorialMode(runtime, next);
    runtime?.flushCommands?.();
};

export const resetTutorialMode = (
    runtime: RuntimeWithTutorialMode | null | undefined,
): void => {
    restoreTutorialMode(runtime, 1);
};
