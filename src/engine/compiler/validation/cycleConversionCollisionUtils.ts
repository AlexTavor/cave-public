import type { EditorAbilities } from "../../../data/schemas/abilities";
import type { ValidationIssue } from "./collisionDetector.types";

export const buildCycleCollisionIssues = (
  abilities: EditorAbilities,
): ValidationIssue[] => {
  if (!abilities.cycle || (abilities.conversion ?? []).length === 0) {
    return [];
  }
  const hasReset = abilities.conversion?.some(
    (entry) => entry.resetCycle !== false,
  );
  if (!hasReset) return [];
  return [
    {
      id: "cycle_state_collision",
      severity: "error",
      ability: "cycle",
      message: "Cycle and Conversion both write to state.cycle.",
    },
  ];
};
