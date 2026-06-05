import type { World } from "miniplex";
import type { RuntimeEntity } from "../types";

const WORLD_ID = "sys_world";

// Fallback counter for contexts that have no sys_world entity (handler unit
// tests). Keyed by the World instance, so it restarts for every fresh world —
// and because replay always builds a new world and re-runs the same tick
// sequence, the id stream stays deterministic. Production always has sys_world,
// so this path is never taken there; the real counter lives in serialized
// sys_world.state (below) precisely so it survives save/load.
const fallbackCounters = new WeakMap<World<RuntimeEntity>, number>();

const readSerial = (entry: unknown): number => {
    const value = (entry as { value?: unknown })?.value;
    return typeof value === "number" && Number.isFinite(value)
        ? Math.max(0, Math.floor(value))
        : 0;
};

/**
 * Mint a deterministic, unique entity id for a spawn — the replacement for
 * `nanoid()` at the engine spawn sites.
 *
 * Why this matters: entity ids feed `RuntimeEntityStore.getSortedEntities()`
 * (sorted by `id.localeCompare`), and that order drives entity iteration and
 * behavior-rule evaluation. Random ids make the iteration order differ between
 * runs, so the headless balancing runner can no longer replay a run from its
 * seed. A monotonic counter gives ids that are both unique and reproducible.
 *
 * The counter lives on `sys_world.state.spawnSerial` (the same passthrough-state
 * home as `bodySerial`), so it persists with saves and rebuilds identically on
 * replay. Read-modify-write is safe because command handlers drain one command
 * at a time on a single thread.
 *
 * `prefix` only labels the id namespace (e.g. "pending" for transfer nodes); the
 * serial is shared, so every id is globally unique regardless of prefix.
 */
export const mintSpawnId = (
    world: World<RuntimeEntity>,
    prefix = "spawn",
): string => {
    const worldEntity = world.entities.find(
        (entity) => entity.id === WORLD_ID,
    ) as { state?: Record<string, unknown> } | undefined;
    if (!worldEntity) {
        const next = (fallbackCounters.get(world) ?? 0) + 1;
        fallbackCounters.set(world, next);
        return `${prefix}_${next}`;
    }
    const state = (worldEntity.state ??= {});
    const next = readSerial(state.spawnSerial) + 1;
    state.spawnSerial = { value: next, visible: false };
    return `${prefix}_${next}`;
};
