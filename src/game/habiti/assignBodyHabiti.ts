import { assignRandomHabiti, sortHabitusIds } from "./assignBodyHabitiRandom";
import { resolveHabitiEligibility } from "./resolveHabitiEligibility";
export type { AssignBodyHabitiInput } from "./assignBodyHabiti.types";
import type { AssignBodyHabitiInput } from "./assignBodyHabiti.types";

export const assignBodyHabiti = (input: AssignBodyHabitiInput) => {
  const assigned = new Set(sortHabitusIds(input.existingHabiti ?? []));
  const rules = input.settings?.habitusTypeRules ?? [];
  assignForcedHabiti(input, assigned);
  rules.forEach((rule) => assignRandomHabiti(input, rule, assigned));
  return sortHabitusIds(assigned);
};

const assignForcedHabiti = (
  input: AssignBodyHabitiInput,
  assigned: Set<string>,
) => {
  for (const id of sortHabitusIds(input.forcedHabiti ?? [])) {
    const definition = input.habitusIndex[id];
    if (!definition) {
      input.onInvalidForcedHabitusId?.(id, "unknown id");
      continue;
    }
    const isEligible = resolveHabitiEligibility({
      definition,
      assignedHabiti: [...assigned],
      habitusIndex: input.habitusIndex,
    });
    if (!isEligible) {
      input.onInvalidForcedHabitusId?.(id, "incompatible with assigned habiti");
      continue;
    }
    assigned.add(id);
  }
};
