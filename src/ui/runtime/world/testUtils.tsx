import React from "react";
import { RuntimeInvalidationService } from "../../../engine/runtime/RuntimeInvalidationService";
import type { RuntimeInvalidationSummary } from "../../../engine/runtime/runtimeInvalidationSummary";
import {
    WorldInteractionContext,
    type WorldInteractionContextValue,
} from "./context/WorldInteractionContext";

const defaultSelect: WorldInteractionContextValue["selectEntity"] = () => {};
const defaultGetCameraState: WorldInteractionContextValue["getCameraState"] =
    () => null;
const defaultSetCameraState: WorldInteractionContextValue["setCameraState"] =
    () => {};
const defaultConsumeRestore: WorldInteractionContextValue["consumePendingCameraRestore"] =
    () => null;
const defaultConsumeEffects: WorldInteractionContextValue["consumeRuntimeVisualEffects"] =
    () => [];

const resolveRuntime = (runtime: WorldInteractionContextValue["runtime"]) => {
    if (!runtime) return null;
    const invalidation = new RuntimeInvalidationService();
    const next = Object.create(runtime) as NonNullable<
        WorldInteractionContextValue["runtime"]
    >;
    next.getEntity =
        runtime.getEntity ??
        ((id: string) =>
            runtime.getEntities?.().find((entity) => entity.id === id) ?? null);
    next.getInvalidation =
        runtime.getInvalidation ?? (() => invalidation.reader);
    return next;
};

export const createWorldInteractionValue = (
    overrides: Partial<WorldInteractionContextValue> = {},
): WorldInteractionContextValue => {
    return {
        runtime: resolveRuntime(overrides.runtime ?? null),
        selectedEntityId: overrides.selectedEntityId ?? null,
        selectEntity: overrides.selectEntity ?? defaultSelect,
        getCameraState: overrides.getCameraState ?? defaultGetCameraState,
        setCameraState: overrides.setCameraState ?? defaultSetCameraState,
        consumePendingCameraRestore:
            overrides.consumePendingCameraRestore ?? defaultConsumeRestore,
        consumeRuntimeVisualEffects:
            overrides.consumeRuntimeVisualEffects ?? defaultConsumeEffects,
    };
};

export const TestWorldInteractionProvider: React.FC<{
    value?: Partial<WorldInteractionContextValue>;
    children: React.ReactNode;
}> = ({ value, children }) => {
    const contextValue = createWorldInteractionValue(value);
    return (
        <WorldInteractionContext.Provider value={contextValue}>
            {children}
        </WorldInteractionContext.Provider>
    );
};

export const createRuntimeTestDouble = <TRuntime extends object>(
    overrides: TRuntime,
) => {
    const invalidation = new RuntimeInvalidationService();
    const runtime = {
        getEntity: (id: string) =>
            (
                overrides as TRuntime & {
                    getEntity?: (entityId: string) => unknown;
                    getEntities?: () => Array<{ id?: string }>;
                }
            ).getEntity?.(id) ??
            (
                overrides as TRuntime & {
                    getEntities?: () => Array<{ id?: string }>;
                }
            )
                .getEntities?.()
                ?.find((entity) => entity.id === id) ??
            null,
        getInvalidation: () => invalidation.reader,
        ...overrides,
    } as TRuntime & WorldInteractionContextValue["runtime"];
    return {
        runtime,
        emitFrame: (tick: number) => invalidation.publishFrame(tick),
        emitMutation: (summary: RuntimeInvalidationSummary) =>
            invalidation.publishMutationSummary(summary),
        resetWorld: (tick?: number) => invalidation.publishWorldReset(tick),
    };
};

