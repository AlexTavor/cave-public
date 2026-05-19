import type { HabitusDefinition } from "../../data/schemas/game/habiti";

export const resolveHabitiEligibility = (input: {
    definition: HabitusDefinition;
    assignedHabiti: string[];
    habitusIndex: Record<string, HabitusDefinition>;
}) => {
    const { definition, assignedHabiti, habitusIndex } = input;
    const assigned = new Set(assignedHabiti);
    if (assigned.has(definition.id)) return false;
    if (definition.excludes.some((id) => assigned.has(id))) return false;
    return !assignedHabiti.some((id) =>
        habitusIndex[id]?.excludes.includes(definition.id),
    );
};
