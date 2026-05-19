import type {
  HabitusDefinition,
  HabitusTypeRule,
  WeightedHabitusPoolEntry,
} from "../../data/schemas/game/habiti";
import { pseudoRandom } from "../../utils/pseudoRandom";
import { withWorldSeed } from "../../utils/worldSeed";
import { resolveHabitiEligibility } from "./resolveHabitiEligibility";
import type { AssignBodyHabitiInput } from "./assignBodyHabiti.types";

export const sortHabitusIds = (ids: Iterable<string>) =>
  [...new Set(ids)].sort((left, right) => left.localeCompare(right));

const countAssignedOfType = (
  assignedHabiti: Iterable<string>,
  habitusType: HabitusTypeRule["habitusType"],
  habitusIndex: Record<string, HabitusDefinition>,
) =>
  [...assignedHabiti].filter((id) => habitusIndex[id]?.type === habitusType)
    .length;

const resolveEligiblePool = (
  rule: HabitusTypeRule,
  assignedHabiti: string[],
  habitusIndex: Record<string, HabitusDefinition>,
) =>
  rule.weightedPool.filter((entry) => {
    const definition = habitusIndex[entry.habitusId];
    return (
      definition?.type === rule.habitusType &&
      resolveHabitiEligibility({
        definition,
        assignedHabiti,
        habitusIndex,
      })
    );
  });

const buildHabitiSeed = (
  input: AssignBodyHabitiInput,
  kind: "pick" | "roll",
  rule: HabitusTypeRule,
  pickIndex: number,
) =>
  withWorldSeed(
    input.worldSeed ?? "world",
    `habiti-${kind}:${input.identitySerial}:${rule.habitusType}:${pickIndex}`,
  );

const selectWeightedEntry = (
  entries: WeightedHabitusPoolEntry[],
  input: AssignBodyHabitiInput,
  rule: HabitusTypeRule,
  pickIndex: number,
) => {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = pseudoRandom(buildHabitiSeed(input, "pick", rule, pickIndex));
  cursor *= totalWeight;
  return entries.find((entry) => (cursor -= entry.weight) < 0) ?? null;
};

export const assignRandomHabiti = (
  input: AssignBodyHabitiInput,
  rule: HabitusTypeRule,
  assigned: Set<string>,
) => {
  let pickIndex = countAssignedOfType(
    assigned,
    rule.habitusType,
    input.habitusIndex,
  );
  while (pickIndex < rule.maxCount) {
    const roll = pseudoRandom(buildHabitiSeed(input, "roll", rule, pickIndex));
    if (roll > rule.probability) break;
    const eligiblePool = resolveEligiblePool(
      rule,
      [...assigned],
      input.habitusIndex,
    );
    if (eligiblePool.length === 0) break;
    const selected = selectWeightedEntry(eligiblePool, input, rule, pickIndex);
    if (!selected) break;
    assigned.add(selected.habitusId);
    pickIndex += 1;
  }
};
