import type { EditorAbilities } from "../../../data/schemas/abilities";
import type { ValidationIssue } from "./collisionDetector.types";

const normalizeResource = (value: string | undefined): string =>
  value?.trim() ?? "";

const getVisibleResourceBarEntries = (abilities: EditorAbilities) => [
  ...(abilities.storage ?? []).flatMap((entry) =>
    entry.visible === false
      ? []
      : [
          {
            ability: "storage",
            resource: entry.resource,
            position: entry.barPosition,
          },
        ],
  ),
  ...((abilities.cycle?.resourceCosts ?? []).flatMap((entry) =>
    entry.visible === false
      ? []
      : [
          {
            ability: "cycle",
            resource: entry.resource,
            position: entry.barPosition,
          },
        ],
  ) ?? []),
];

export const buildMissingResourceBarPositionIssues = (
  abilities: EditorAbilities,
): ValidationIssue[] =>
  getVisibleResourceBarEntries(abilities)
    .filter((entry) => !entry.position)
    .map((entry) => ({
      id: `${entry.ability}_resource_bar_position_missing_${normalizeResource(entry.resource)}`,
      severity: "error" as const,
      ability: entry.ability,
      message: `${entry.ability} resource '${normalizeResource(entry.resource)}' requires barPosition when visible.`,
    }));

export const buildResourceBarPositionCollisionIssues = (
  abilities: EditorAbilities,
): ValidationIssue[] => {
  const counts = new Map<string, number>();
  getVisibleResourceBarEntries(abilities).forEach((entry) => {
    if (!entry.position) return;
    counts.set(entry.position, (counts.get(entry.position) ?? 0) + 1);
  });
  return Array.from(counts)
    .filter(([, count]) => count > 1)
    .map(([position]) => ({
      id: `resource_bar_position_duplicate_${position}`,
      severity: "error" as const,
      ability: "display",
      message: `Duplicate visible resource bar position '${position}'.`,
    }));
};
