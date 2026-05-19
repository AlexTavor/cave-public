import { useEffect, useRef, useState } from "react";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import {
    CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY,
    hasConditionalActivationSavedThrottleState,
} from "../../../../engine/runtime/conditionalActivationState";
import { resolvePowerSink } from "./selectionUtils";
import { useEntitySelector } from "./useEntitySelector";
import { useDebouncedCallback } from "./useDebouncedCallback";

const clampThrottle = (value: number) => Math.max(0, Math.min(1, value));

const resolveThrottle = (entity: RuntimeEntity): number | null => {
    const sink = resolvePowerSink(entity);
    return typeof sink?.throttle === "number" && Number.isFinite(sink.throttle)
        ? sink.throttle
        : null;
};

export const usePowerSinkThrottle = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
) => {
    const liveThrottle = useEntitySelector(runtime, entity.id, resolveThrottle);
    const [targetThrottle, setTargetThrottle] = useState(
        () => liveThrottle ?? resolveThrottle(entity) ?? -1,
    );
    const entityRef = useRef(entity);
    const pendingThrottleRef = useRef<number | null>(null);
    const runtimeRef = useRef(runtime);

    useEffect(() => {
        entityRef.current = entity;
    }, [entity]);

    useEffect(() => {
        runtimeRef.current = runtime;
    }, [runtime]);

    useEffect(() => {
        const nextThrottle = liveThrottle ?? resolveThrottle(entity) ?? -1;
        if (
            pendingThrottleRef.current != null &&
            pendingThrottleRef.current !== nextThrottle
        ) {
            return;
        }
        pendingThrottleRef.current = null;
        setTargetThrottle(nextThrottle);
    }, [
        liveThrottle,
        entity,
        (entity as { state?: { is_depleted?: { value?: unknown } } }).state
            ?.is_depleted?.value,
    ]);

    const emitThrottle = useDebouncedCallback((nextThrottle: number) => {
        const currentRuntime = runtimeRef.current;
        const currentEntity = entityRef.current;
        if (!currentRuntime || !currentEntity.id) return;
        const sink = resolvePowerSink(currentEntity);
        if (!sink) return;
        const currentThrottle = resolveThrottle(currentEntity);
        if (currentThrottle === nextThrottle) {
            pendingThrottleRef.current = null;
            return;
        }

        const world = currentRuntime.getEntity("sys_world") as
            | { state?: { cave_tut_throttle_seen?: { value?: unknown } } }
            | undefined;
        if (world?.state?.cave_tut_throttle_seen?.value !== true) {
            currentRuntime.commands.enqueue({
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "sys_world",
                    key: "cave_tut_throttle_seen",
                    value: true,
                },
            });
        }

        currentRuntime.commands.enqueue({
            type: RuntimeCommandType.UPDATE_POWER_SINK,
            payload: {
                entityId: currentEntity.id,
                throttle: nextThrottle,
                efficiency: sink.efficiency ?? 0,
                drawFraction: sink.drawFraction ?? {},
                status: sink.status ?? "blackout",
            },
        });
        if (hasConditionalActivationSavedThrottleState(currentEntity)) {
            currentRuntime.commands.enqueue({
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: currentEntity.id,
                    key: CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY,
                    value: nextThrottle,
                    visible: false,
                },
            });
        }
        if (currentRuntime.getState().status === "paused") {
            currentRuntime.stepOncePreservingPause();
            currentRuntime.flushCommands?.();
        }
    }, 150);

    const updateThrottle = (value: number) => {
        const clamped = clampThrottle(value);
        pendingThrottleRef.current = clamped;
        setTargetThrottle(clamped);
        emitThrottle(clamped);
    };

    return { targetThrottle, updateThrottle };
};

