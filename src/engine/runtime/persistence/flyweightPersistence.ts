import type { RuntimeEntity } from "../types";
import {
  STATEFUL_KEYS,
  cloneStatefulComponents,
} from "../handlers/spawnCloneUtils";
import { coerceBlueprintId } from "../blueprintId";
import type { RuntimePersistenceTarget } from "./RuntimePersistenceTarget";
import { mergeStateForHydrate, saveState } from "./flyweightStatePersistence";

const copyStatefulForSave = (
  source: RuntimeEntity,
  target: RuntimeEntity,
  baseState: unknown,
): void => {
  for (const key of STATEFUL_KEYS) {
    if (!(key in source)) continue;
    const value = (source as Record<string, unknown>)[key];
    if (key === "state") {
      const savedState = saveState(baseState, value);
      if (!Object.keys(savedState).length) continue;
      (target as Record<string, unknown>)[key] = savedState;
      continue;
    }
    (target as Record<string, unknown>)[key] = structuredClone(value);
  }
};

const overlayStatefulForHydrate = (
  source: RuntimeEntity,
  target: RuntimeEntity,
): void => {
  for (const key of STATEFUL_KEYS) {
    if (!(key in source)) continue;
    const value = (source as Record<string, unknown>)[key];
    if (key === "state") {
      const targetState = (target as Record<string, unknown>)["state"];
      (target as Record<string, unknown>)["state"] = mergeStateForHydrate(
        targetState,
        value,
      );
      continue;
    }
    (target as Record<string, unknown>)[key] = structuredClone(value);
  }
};

export const serializeFlyweightEntity = (
  runtime: RuntimePersistenceTarget,
  entity: RuntimeEntity,
): RuntimeEntity => {
  const blueprintId = coerceBlueprintId(entity.blueprintId);
  if (!blueprintId) return structuredClone(entity);
  const blueprint = runtime.getCartridge().blueprints[blueprintId];

  const serialized: RuntimeEntity = {
    id: entity.id,
    blueprintId,
  };
  copyStatefulForSave(entity, serialized, blueprint?.components?.state);
  return serialized;
};

export const hydrateFlyweightEntity = (
  runtime: RuntimePersistenceTarget,
  savedEntity: RuntimeEntity,
): RuntimeEntity => {
  const blueprintId = coerceBlueprintId(savedEntity.blueprintId);
  if (!blueprintId) return structuredClone(savedEntity);

  const blueprint = runtime.getCartridge().blueprints[blueprintId];
  if (!blueprint) return structuredClone(savedEntity);

  const base = cloneStatefulComponents(blueprint.components);

  const hydrated: RuntimeEntity = {
    id: savedEntity.id,
    blueprintId,
    label: blueprint.label,
    tags: [...(blueprint.tags ?? [])],
    ...base,
  };

  overlayStatefulForHydrate(savedEntity, hydrated);
  return hydrated;
};
