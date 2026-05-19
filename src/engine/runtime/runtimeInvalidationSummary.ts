import type { RuntimeCommand } from "./types";
import { applyRuntimeInvalidationCommand } from "./runtimeInvalidationSummary.helpers";
export type { RuntimeInvalidationSummary } from "./runtimeInvalidationSummary.types";
import type { RuntimeInvalidationSummary } from "./runtimeInvalidationSummary.types";

const normalizeChangedEntityIds = (ids: string[]) =>
  [...new Set(ids.filter((id) => id.length > 0))].sort((left, right) =>
    left.localeCompare(right),
  );

export const EMPTY_RUNTIME_INVALIDATION_SUMMARY: RuntimeInvalidationSummary = {
  changedEntityIds: [],
  entityListChanged: false,
  blueprintChanged: false,
};

export const mergeRuntimeInvalidationSummaries = (
  left: RuntimeInvalidationSummary,
  right: RuntimeInvalidationSummary,
): RuntimeInvalidationSummary => ({
  changedEntityIds: normalizeChangedEntityIds([
    ...left.changedEntityIds,
    ...right.changedEntityIds,
  ]),
  entityListChanged: left.entityListChanged || right.entityListChanged,
  blueprintChanged: left.blueprintChanged || right.blueprintChanged,
});

export const resolveRuntimeInvalidationSummary = (
  commands: RuntimeCommand[],
): RuntimeInvalidationSummary => {
  const summary = {
    ...EMPTY_RUNTIME_INVALIDATION_SUMMARY,
    changedEntityIds: [],
  };
  commands.forEach((command) =>
    applyRuntimeInvalidationCommand(summary, command),
  );
  return mergeRuntimeInvalidationSummaries(
    EMPTY_RUNTIME_INVALIDATION_SUMMARY,
    summary,
  );
};
