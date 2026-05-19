import type { RuntimePersistenceTarget } from "./RuntimePersistenceTarget";
import type { SaveGameData } from "./types";
import { hydrateFlyweightEntity } from "./flyweightPersistence";
import { normalizeHydratedDisplayKeys } from "./normalizeHydratedDisplayKeys";
import { ensureWorldSeedState } from "../../../utils/worldSeed";
import { restorePhysicsBody } from "./physicsBodyPersistence";
import { hydrateRawSystemWorld } from "./hydrateRawSystemWorld";

const clearWorld = (runtime: RuntimePersistenceTarget) => {
  const world = runtime.getWorld();
  for (const entity of Array.from(world.entities)) world.remove(entity);
};

const clearTransientDraft = (worldEntity: any) => {
  const draft = worldEntity?.draft;
  if (!draft || typeof draft !== "object") return;
  worldEntity.draft = {
    _tag: "draft",
    active: false,
    poolId: "",
    triggerEntityId: "",
    options: [],
    sourceLabel: "",
    selectedOptionId: null,
    pickedOneOffs: Array.isArray(draft.pickedOneOffs)
      ? structuredClone(draft.pickedOneOffs)
      : [],
    shownCountsByPool:
      draft.shownCountsByPool && typeof draft.shownCountsByPool === "object"
        ? structuredClone(draft.shownCountsByPool)
        : {},
    cycleNumber: 0,
    currentText: "",
  };
};

/**
 * Restores a fresh runtime to a previously serialized state.
 * Must be called on a runtime that has been reset/reloaded first.
 */
export const hydrateRuntime = (
  runtime: RuntimePersistenceTarget,
  data: SaveGameData,
): void => {
  const normalized = normalizeHydratedDisplayKeys(data);
  const state = runtime.getState();
  state.tick = normalized.state.tick;
  clearWorld(runtime);
  for (const entity of normalized.state.entities) {
    const isRawSystemWorld =
      entity.id === "sys_world" && typeof entity.blueprintId !== "string";
    runtime.addEntity(
      isRawSystemWorld
        ? hydrateRawSystemWorld(runtime, entity)
        : hydrateFlyweightEntity(runtime, entity),
    );
  }
  const worldEntity = runtime.getEntity("sys_world") as any;
  if (worldEntity) {
    ensureWorldSeedState(worldEntity, state.seed);
    clearTransientDraft(worldEntity);
  }
  for (const [id, serialized] of Object.entries(normalized.state.physics)) {
    restorePhysicsBody(runtime, id, serialized);
  }
};
