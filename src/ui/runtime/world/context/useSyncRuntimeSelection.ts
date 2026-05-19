import { useEffect, useRef } from "react";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import type { Runtime } from "../../../../engine/runtime/Runtime";

export const useSyncRuntimeSelection = (
    runtime: Runtime | null,
    selectedEntityId: string | null,
): void => {
    const lastValueRef = useRef<string | null>(null);
    const lastRuntimeRef = useRef<Runtime | null>(null);

    useEffect(() => {
        if (!runtime) {
            lastRuntimeRef.current = null;
            lastValueRef.current = null;
            return;
        }
        const nextValue = selectedEntityId ?? "";
        const world =
            typeof runtime.getEntity === "function"
                ? (runtime.getEntity("sys_world") as any)
                : null;
        const currentValue = world?.state?.cave_selected_entity_id?.value;
        if (runtime !== lastRuntimeRef.current) {
            lastRuntimeRef.current = runtime;
            lastValueRef.current =
                typeof currentValue === "string" ? currentValue : null;
        }
        if (currentValue === nextValue || lastValueRef.current === nextValue)
            return;
        runtime.commands.enqueue({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: "sys_world",
                key: "cave_selected_entity_id",
                value: nextValue,
            },
        });
        if (
            runtime.getState?.().status === "paused" &&
            typeof runtime.stepOncePreservingPause === "function" &&
            typeof runtime.flushCommands === "function"
        ) {
            runtime.stepOncePreservingPause();
            runtime.flushCommands();
        }
        lastValueRef.current = nextValue;
    }, [runtime, selectedEntityId]);
};
