import { RuntimeCommandType, type RuntimeCommand } from "./types";
import type { RuntimeInvalidationSummary } from "./runtimeInvalidationSummary.types";

const DIRECT_ID_KEYS = [
  "entityId",
  "id",
  "sourceId",
  "targetId",
  "stationId",
  "triggerEntityId",
  "bodyId",
  "nodeId",
] as const;
const WORLD_ID = "sys_world";

const addId = (summary: RuntimeInvalidationSummary, id: unknown) => {
  if (typeof id === "string" && id.length > 0) {
    summary.changedEntityIds.push(id);
  }
};

const addDirectIds = (
  summary: RuntimeInvalidationSummary,
  payload: Record<string, unknown>,
) => {
  DIRECT_ID_KEYS.forEach((key) => addId(summary, payload[key]));
  const updates = payload.updates;
  if (!Array.isArray(updates)) return;
  updates.forEach((update) =>
    addId(summary, (update as { entityId?: unknown }).entityId),
  );
};

export const applyRuntimeInvalidationCommand = (
  summary: RuntimeInvalidationSummary,
  command: RuntimeCommand,
) => {
  const payload = (command.payload ?? {}) as Record<string, unknown>;
  addDirectIds(summary, payload);
  switch (command.type) {
    case RuntimeCommandType.SPAWN:
    case RuntimeCommandType.SPAWN_CARRIER:
      addId(summary, payload.parentId);
      summary.entityListChanged = true;
      return;
    case RuntimeCommandType.SPAWN_AUTOMATION:
    case RuntimeCommandType.KILL:
    case RuntimeCommandType.RESOLVE_TRANSFER:
    case RuntimeCommandType.RESOLVE_BODY_PROCESSING:
      addId(summary, WORLD_ID);
      summary.entityListChanged = true;
      return;
    case RuntimeCommandType.TRANSFER_ASSETS:
      if (payload.isImmediate !== true) summary.entityListChanged = true;
      return;
    case RuntimeCommandType.PATCH_BLUEPRINT:
      summary.blueprintChanged = true;
      return;
    case RuntimeCommandType.SET_GLOBAL:
    case RuntimeCommandType.ADJUST_FACT:
    case RuntimeCommandType.GAME_DORMANCY:
    case RuntimeCommandType.AWAKEN_CAVE:
    case RuntimeCommandType.RESOLVE_DRAFT:
    case RuntimeCommandType.CLEAR_DRAFT:
    case RuntimeCommandType.SET_TUTORIAL_STATE:
    case RuntimeCommandType.SHOW_THOUGHT:
    case RuntimeCommandType.ACKNOWLEDGE_THOUGHT:
    case RuntimeCommandType.CLEAR_THOUGHT:
    case RuntimeCommandType.ACKNOWLEDGE_HABITI_ANNOUNCEMENT:
    case RuntimeCommandType.ACKNOWLEDGE_NOTIFICATION_ABILITY_GUIDANCE:
    case RuntimeCommandType.ACKNOWLEDGE_TUTORIAL_MODAL_GUIDANCE:
    case RuntimeCommandType.TRIGGER_DRAFT:
    case RuntimeCommandType.GAIN_HABITI:
      addId(summary, WORLD_ID);
      return;
    case RuntimeCommandType.UPDATE_ASSIGNMENT:
      ((payload.assignedIds as unknown[]) ?? []).forEach((id) =>
        addId(summary, id),
      );
      return;
    default:
      return;
  }
};
