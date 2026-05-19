import { SysConfigSchema } from "../../../data/schemas/v2/config";
import { STATEFUL_KEYS } from "../handlers/spawnCloneUtils";
import type { RuntimePersistenceTarget } from "./RuntimePersistenceTarget";
import type { RuntimeEntity } from "../types";
import { mergeStateForHydrate } from "./flyweightStatePersistence";

const RUNTIME_KEYS = [
  ...STATEFUL_KEYS.filter((key) => key !== "state"),
  "draft",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const mergeWorldState = (baseState: unknown, savedState: unknown) => {
  const merged = mergeStateForHydrate(baseState, savedState);
  if (!isRecord(savedState)) return merged;
  for (const [key, entry] of Object.entries(savedState)) {
    if (!isRecord(entry) || typeof entry.max !== "number") continue;
    const mergedEntry = isRecord(merged[key]) ? merged[key] : {};
    merged[key] = { ...mergedEntry, max: entry.max };
  }
  return merged;
};

const overlayRuntimeKeys = (
  savedEntity: RuntimeEntity,
  hydrated: RuntimeEntity,
): void => {
  for (const key of RUNTIME_KEYS) {
    if (!(key in savedEntity)) continue;
    (hydrated as Record<string, unknown>)[key] = structuredClone(
      (savedEntity as Record<string, unknown>)[key],
    );
  }
};

export const hydrateRawSystemWorld = (
  runtime: RuntimePersistenceTarget,
  savedEntity: RuntimeEntity,
): RuntimeEntity => {
  const config = SysConfigSchema.parse(
    runtime.getCartridge().config?.settings ?? {},
  );
  const base = structuredClone(config.world) as RuntimeEntity;
  const hydrated: RuntimeEntity = { ...base, id: savedEntity.id };
  hydrated.state = mergeWorldState(base.state, savedEntity.state) as any;
  overlayRuntimeKeys(savedEntity, hydrated);
  return hydrated;
};
