import type { EditorAbilities } from "../../../data/schemas/abilities";
import type { CollisionRule, ValidationIssue } from "./collisionDetector.types";
import { deriveSamplerTargetKey } from "../abilities/samplerUtils";
import { requiresCycleAbility } from "./abilityTriggerValidation";

const checkSpawnerDependency = (
  abilities: EditorAbilities,
): ValidationIssue[] => {
  if (!requiresCycleAbility(abilities.spawner) || abilities.cycle) return [];
  return [
    {
      id: "spawner_requires_cycle",
      severity: "error",
      ability: "spawner",
      message: "Spawner Ability requires a Cycle Ability to trigger.",
    },
  ];
};

const checkSamplerDependency = (
  abilities: EditorAbilities,
): ValidationIssue[] => {
  if (!requiresCycleAbility(abilities.sampler) || abilities.cycle) return [];
  return [
    {
      id: "sampler_requires_cycle",
      severity: "error",
      ability: "sampler",
      message: "Sampler Ability requires a Cycle Ability to trigger.",
    },
  ];
};

const checkDraftDependency = (
  abilities: EditorAbilities,
): ValidationIssue[] => {
  if (!requiresCycleAbility(abilities.draft) || abilities.cycle) return [];
  return [
    {
      id: "draft_requires_cycle",
      severity: "error",
      ability: "draft",
      message: "Draft Ability requires a Cycle Ability to trigger.",
    },
  ];
};

const checkTriggeredActionsDependency = (
  abilities: EditorAbilities,
): ValidationIssue[] => {
  if (!requiresCycleAbility(abilities.triggeredActions) || abilities.cycle) {
    return [];
  }
  return [
    {
      id: "triggered_actions_requires_cycle",
      severity: "error",
      ability: "triggeredActions",
      message: "Triggered Actions ability requires a Cycle Ability to trigger.",
    },
  ];
};

const collisionRules: CollisionRule[] = [
  { id: "spawner_requires_cycle", check: checkSpawnerDependency },
  { id: "sampler_requires_cycle", check: checkSamplerDependency },
  { id: "draft_requires_cycle", check: checkDraftDependency },
  { id: "triggered_actions_requires_cycle", check: checkTriggeredActionsDependency },
];

export const detectExtraCollisions = (abilities: EditorAbilities): ValidationIssue[] =>
  collisionRules.flatMap((rule) => rule.check(abilities));

export const buildSpawnerBlueprintIssues = (
  abilities: EditorAbilities,
  blueprintIds: Set<string>,
): ValidationIssue[] => {
  if (!abilities.spawner?.length || blueprintIds.size === 0) return [];
  return abilities.spawner.flatMap((entry, index) => {
    const blueprintId = entry.blueprintId?.trim();
    if (!blueprintId || blueprintIds.has(blueprintId)) return [];
    return [
      {
        id: `spawner_missing_${blueprintId}_${index}`,
        severity: "warning",
        ability: "spawner",
        message: `Spawner target '${blueprintId}' does not exist.`,
      },
    ];
  });
};

export const buildSamplerTargetIssues = (
  abilities: EditorAbilities,
  stateKeys: Set<string>,
  reservedKeys: Set<string>,
): ValidationIssue[] => {
  const samplerTargets = (abilities.sampler ?? [])
    .map((entry) => {
      const source = entry.source?.trim() ?? "";
      const derived = source ? deriveSamplerTargetKey(source) : null;
      return (derived ?? entry.target ?? "").trim();
    })
    .filter(Boolean);

  const nonSamplerState = new Set(
    Array.from(stateKeys).filter((key) => !samplerTargets.includes(key)),
  );

  const duplicateTargets = samplerTargets.filter(
    (target, index) => samplerTargets.indexOf(target) !== index,
  );

  const duplicateIssues = Array.from(new Set(duplicateTargets)).map(
    (target) => ({
      id: `sampler_target_duplicate_${target}`,
      severity: "error" as const,
      ability: "sampler",
      message: `Sampler target '${target}' is duplicated.`,
    }),
  );

  const collisionIssues = samplerTargets.flatMap((target) => {
    if (!target) return [];
    if (!nonSamplerState.has(target) && !reservedKeys.has(target)) return [];
    return [
      {
        id: `sampler_target_collision_${target}`,
        severity: "error" as const,
        ability: "sampler",
        message: `Sampler target '${target}' collides with existing state.`,
      },
    ];
  });

  return [...duplicateIssues, ...collisionIssues];
};
