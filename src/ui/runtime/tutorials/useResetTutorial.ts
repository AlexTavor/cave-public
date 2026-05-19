import { useCallback, useEffect, useState } from "react";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { useRuntimeStore } from "../state/useRuntimeStore";
import {
    clearTutorialCompletionMemory,
    extractTutorialCompletionMemory,
} from "./tutorialCompletionMemory";
import {
    readStoredTutorialMode,
    readTutorialModeValue,
    resetTutorialMode,
} from "./tutorialModeMemory";
import { useEntitySelector } from "../world/selection/useEntitySelector";

export const useResetTutorial = () => {
    const runtime = useRuntimeStore((state) => state.runtime);
    const [pendingReset, setPendingReset] = useState(false);
    const canResetFromStorage =
        Object.keys(extractTutorialCompletionMemory(null)).length > 0 ||
        readStoredTutorialMode() === 0;
    const canResetFromWorld =
        useEntitySelector(
            runtime,
            "sys_world",
            (world) => {
                const completed = world?.permanent?.tutorial_completed ?? {};
                const active = world?.tutorial?.active === true;
                return (
                    active ||
                    readTutorialModeValue(world) === 0 ||
                    Object.values(completed).some(
                        (v) => typeof v === "number" && v > 0,
                    )
                );
            },
            (left, right) => left === right,
        ) ?? false;

    useEffect(() => setPendingReset(false), [runtime]);
    useEffect(() => {
        if (!canResetFromWorld) setPendingReset(false);
    }, [canResetFromWorld]);

    const resetTutorial = useCallback(() => {
        if (pendingReset || (!canResetFromWorld && !canResetFromStorage))
            return;
        setPendingReset(true);
        clearTutorialCompletionMemory(runtime);
        resetTutorialMode(runtime);
        if (!runtime) return;
        runtime.commands.enqueue({
            type: RuntimeCommandType.SET_TUTORIAL_STATE,
            payload: { tutorial: null },
        });
        if (runtime.getState().status === "paused") runtime.flushCommands();
    }, [canResetFromStorage, canResetFromWorld, pendingReset, runtime]);

    return {
        canResetTutorial:
            (canResetFromWorld || canResetFromStorage) && !pendingReset,
        resetTutorial,
    } as const;
};
