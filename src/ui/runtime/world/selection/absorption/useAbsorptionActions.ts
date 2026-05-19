import { useCallback, useEffect, useRef } from "react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import { RuntimeCommandType } from "../../../../../engine/runtime/types";
import { useRuntimeStore } from "../../../state/useRuntimeStore";

const BODY_SELECTOR_FACT_ABOUT = "world";

const syncPausedRuntime = (runtime: Runtime) => {
    if (
        runtime.getState?.().status !== "paused" ||
        typeof runtime.stepOncePreservingPause !== "function" ||
        typeof runtime.flushCommands !== "function"
    ) {
        return;
    }
    runtime.stepOncePreservingPause();
    runtime.flushCommands();
};

export const useAbsorptionActions = (
    runtime: Runtime,
    targetId: string,
    isSelectorOpen: boolean,
) => {
    const openRef = useRef(isSelectorOpen);
    const closeSelectorRef = useRef<() => void>(() => undefined);
    const resumeStatusRef = useRef<string | null>(null);
    const status = useRuntimeStore((state) => state.status);
    const pause = useRuntimeStore((state) => state.pause);
    const play = useRuntimeStore((state) => state.play);
    openRef.current = isSelectorOpen;

    const setSelectorOpen = useCallback(
        (open: boolean) => {
            if (open === openRef.current) return;
            openRef.current = open;
            if (open) {
                resumeStatusRef.current ??= status;
                if (status === "running") pause();
            }
            runtime.commands.enqueue({
                type: RuntimeCommandType.ADJUST_FACT,
                payload: {
                    scope: "run",
                    factType: "body_selector_open",
                    factAbout: BODY_SELECTOR_FACT_ABOUT,
                    delta: open ? 1 : -1,
                },
            });
            syncPausedRuntime(runtime);
            if (!open && resumeStatusRef.current === "running") play();
            if (!open) resumeStatusRef.current = null;
        },
        [pause, play, runtime, status],
    );
    const dispatchBodies = useCallback(
        (ids: string[]) => {
            runtime.commands.enqueue({
                type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
                payload: {
                    updates: ids.map((bodyId) => ({
                        bodyId,
                        ownerId: targetId,
                    })),
                },
            });
        },
        [runtime, targetId],
    );

    const recallBodies = useCallback(
        (ids: string[]) => {
            runtime.commands.enqueue({
                type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
                payload: {
                    updates: ids.map((bodyId) => ({
                        bodyId,
                        ownerId: "sys_world",
                    })),
                },
            });
        },
        [runtime],
    );
    const openSelector = useCallback(
        () => setSelectorOpen(true),
        [setSelectorOpen],
    );
    const closeSelector = useCallback(
        () => setSelectorOpen(false),
        [setSelectorOpen],
    );
    closeSelectorRef.current = closeSelector;

    useEffect(
        () => () => {
            closeSelectorRef.current();
        },
        [],
    );

    return {
        dispatchBodies,
        recallBodies,
        openSelector,
        closeSelector,
    };
};

