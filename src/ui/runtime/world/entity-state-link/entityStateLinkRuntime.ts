import { useCallback, useEffect, useRef, useState } from "react";
import type { BarBindingInput } from "./types";
import {
  createBarBinding,
  readRuntimeEntity,
  updateBarEntityCount,
  updateBarProgress,
} from "./entityStateLinkRuntime.helpers";
import { useEntityLinkInvalidation } from "./useEntityLinkInvalidation";

export type {
  RuntimeLike,
  InternalBarBinding,
} from "./entityStateLinkRuntime.types";
import type {
  RuntimeLike,
  InternalBarBinding,
} from "./entityStateLinkRuntime.types";
export const BAR_SYNC_INTERVAL_MS = 16;
export const createInternalBarBinding = (
  binding: BarBindingInput,
  element: HTMLElement,
): InternalBarBinding => createBarBinding(binding, element);
export const syncSingleEntityBarBinding = (
  runtime: RuntimeLike,
  binding: InternalBarBinding,
  entityIndex: Map<string, any>,
) => {
  const entity = readRuntimeEntity(runtime, entityIndex, binding.entityId);
  if (!entity) return updateBarProgress(binding, 0, null);
  updateBarProgress(
    binding,
    binding.valueResolver(entity),
    binding.maxResolver?.(entity) ?? null,
  );
};
export const syncEntityBarBindings = (
  runtime: RuntimeLike,
  registry: Map<string, InternalBarBinding>,
  entityIndex: Map<string, any>,
  dirtyEntityIds: Set<string>,
  forceAll: boolean,
) => {
  entityIndex.clear();
  for (const binding of registry.values())
    if (forceAll || dirtyEntityIds.has(binding.entityId))
      syncSingleEntityBarBinding(runtime, binding, entityIndex);
};
export const useEntityBarRuntime = (runtime: RuntimeLike | null) => {
  const [version, setVersion] = useState(0);
  const registryRef = useRef(new Map<string, InternalBarBinding>()),
    entityIndexRef = useRef(new Map<string, any>());
  const entityCountsRef = useRef(new Map<string, number>()),
    dirtyEntityIdsRef = useRef(new Set<string>()),
    fullRefreshRef = useRef(false);
  useEntityLinkInvalidation(
    runtime,
    registryRef.current.size > 0,
    entityCountsRef,
    dirtyEntityIdsRef,
    fullRefreshRef,
  );
  const register = useCallback(
    (id: string, binding: BarBindingInput, element: HTMLElement) => {
      const wasEmpty = registryRef.current.size === 0,
        previous = registryRef.current.get(id);
      if (
        previous &&
        updateBarEntityCount(entityCountsRef.current, previous.entityId, -1) ===
          0
      )
        dirtyEntityIdsRef.current.delete(previous.entityId);
      registryRef.current.set(id, createInternalBarBinding(binding, element));
      updateBarEntityCount(entityCountsRef.current, binding.entityId, 1);
      if (wasEmpty) setVersion((value) => value + 1);
      const current = registryRef.current.get(id);
      if (runtime && current)
        syncSingleEntityBarBinding(runtime, current, entityIndexRef.current);
    },
    [runtime],
  );
  const unregister = useCallback((id: string) => {
    const previous = registryRef.current.get(id);
    if (!previous) return;
    registryRef.current.delete(id);
    if (
      updateBarEntityCount(entityCountsRef.current, previous.entityId, -1) === 0
    )
      dirtyEntityIdsRef.current.delete(previous.entityId);
    if (registryRef.current.size === 0) setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!runtime || registryRef.current.size === 0) return undefined;
    const timer = globalThis.setInterval(() => {
      if (!fullRefreshRef.current && dirtyEntityIdsRef.current.size === 0)
        return;
      syncEntityBarBindings(
        runtime,
        registryRef.current,
        entityIndexRef.current,
        dirtyEntityIdsRef.current,
        fullRefreshRef.current,
      );
      fullRefreshRef.current = false;
      dirtyEntityIdsRef.current.clear();
    }, BAR_SYNC_INTERVAL_MS);
    return () => globalThis.clearInterval(timer);
  }, [runtime, version]);
  return { register, unregister };
};
