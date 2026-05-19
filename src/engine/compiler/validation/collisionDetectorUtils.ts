import type { EditorAbilities } from "../../../data/schemas/abilities";
import type { ValidationIssue } from "./collisionDetector.types";
import { requiresCycleAbility } from "./abilityTriggerValidation";

export { buildCycleCollisionIssues } from "./cycleConversionCollisionUtils";
export {
  buildMissingResourceBarPositionIssues,
  buildResourceBarPositionCollisionIssues,
} from "./resourceBarCollisionUtils";

export const normalizeResource = (value: string | undefined): string =>
  value?.trim() ?? "";

export const buildDuplicateIssues = (
  resources: string[],
  ability: string,
): ValidationIssue[] => {
  const counts = new Map<string, number>();
  for (const resource of resources) {
    if (!resource) continue;
    counts.set(resource, (counts.get(resource) ?? 0) + 1);
  }
  return Array.from(counts)
    .filter(([, count]) => count > 1)
    .map(([resource]) => ({
      id: `${ability}_duplicate_${resource}`,
      severity: "error" as const,
      ability,
      message: `Duplicate ${ability} entries for '${resource}'.`,
    }));
};

export const buildUpkeepOrphanIssues = (
  storageResources: string[],
  upkeepResources: string[],
): ValidationIssue[] => {
  const storageSet = new Set(storageResources.filter(Boolean));
  return upkeepResources
    .filter((resource) => resource && !storageSet.has(resource))
    .map((resource) => ({
      id: `upkeep_orphan_${resource}`,
      severity: "warning" as const,
      ability: "upkeep",
      message: `Upkeep requires '${resource}' storage.`,
    }));
};

export const buildProductionDependencyIssues = (
  abilities: EditorAbilities,
): ValidationIssue[] => {
  if (!requiresCycleAbility(abilities.production) || abilities.cycle) return [];
  return [
    {
      id: "production_requires_cycle",
      severity: "error",
      ability: "production",
      message: "Production Ability requires a Cycle Ability to trigger.",
    },
  ];
};
