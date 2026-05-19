import type { EditorConfig } from "../../../data/schemas/abilities";
import { getMalformedAbilityIssues } from "./collisionDetector.malformed";
import {
  buildDuplicateIssues,
  buildMissingResourceBarPositionIssues,
  buildProductionDependencyIssues,
  buildResourceBarPositionCollisionIssues,
  buildUpkeepOrphanIssues,
  buildCycleCollisionIssues,
  normalizeResource,
} from "./collisionDetectorUtils";
import { requiresCycleAbility } from "./abilityTriggerValidation";
import {
  buildSamplerTargetIssues,
  buildSpawnerBlueprintIssues,
  detectExtraCollisions,
} from "./collisionDetectorExtras";

export type {
  ValidationSeverity,
  ValidationIssue,
} from "./collisionDetector.types";
import type {
  CollisionDetectorOptions,
  ValidationIssue,
} from "./collisionDetector.types";

const buildUpdaterDependencyIssues = (
  abilities: NonNullable<EditorConfig["abilities"]>,
): ValidationIssue[] => {
  const updater = abilities.updater ?? [];
  if (requiresCycleAbility(updater) && !abilities.cycle) {
    return [
      {
        id: "updater-requires-cycle",
        severity: "warning",
        message: "Updater abilities require a Cycle ability to trigger.",
        ability: "updater",
      },
    ];
  }
  return [];
};

export const collisionDetector = (
  editor: EditorConfig | undefined,
  options: CollisionDetectorOptions = {},
): ValidationIssue[] => {
  const abilities = editor?.abilities ?? {};
  const blueprintIds = new Set(options.blueprintIds ?? []);
  const stateKeys = new Set(options.stateKeys ?? []);
  const reservedKeys = new Set(
    options.reservedStateKeys ?? ["cycle", "physics", "display"],
  );

  const storageResources = (abilities.storage ?? []).map((entry) =>
    normalizeResource(entry.resource),
  );

  const productionResources = (abilities.production ?? []).map((entry) =>
    normalizeResource(entry.resource),
  );

  const upkeepResources = (abilities.upkeep ?? []).map((entry) =>
    normalizeResource(entry.resource),
  );

  return [
    ...getMalformedAbilityIssues(abilities),
    ...buildDuplicateIssues(storageResources, "storage"),
    ...buildDuplicateIssues(productionResources, "production"),
    ...buildDuplicateIssues(upkeepResources, "upkeep"),
    ...buildMissingResourceBarPositionIssues(abilities),
    ...buildResourceBarPositionCollisionIssues(abilities),
    ...buildCycleCollisionIssues(abilities),
    ...buildUpkeepOrphanIssues(storageResources, upkeepResources),
    ...buildProductionDependencyIssues(abilities),
    ...detectExtraCollisions(abilities),
    ...buildSpawnerBlueprintIssues(abilities, blueprintIds),
    ...buildSamplerTargetIssues(abilities, stateKeys, reservedKeys),
    ...buildUpdaterDependencyIssues(abilities),
  ];
};
