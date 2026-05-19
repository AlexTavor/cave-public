import type {
    HabitusDefinition,
    HabitusTypeId,
    HabitusTypeRule,
    WeightedHabitusPoolEntry,
} from "../../../../../data/schemas/game/habiti";

export const getHabitusPoolSuggestions = (
    habitusIndex: Record<string, HabitusDefinition>,
    habitusType: HabitusTypeId,
) =>
    Object.values(habitusIndex)
        .filter((definition) => definition.type === habitusType)
        .map((definition) => definition.id)
        .sort((left, right) => left.localeCompare(right));

export const validateHabitusTypeRuleTypeChange = (
    rules: HabitusTypeRule[],
    index: number,
    nextType: HabitusTypeId,
) => {
    const duplicate = rules.some(
        (rule, currentIndex) =>
            currentIndex !== index && rule.habitusType === nextType,
    );
    return duplicate
        ? { success: false as const, reason: "duplicate" as const }
        : { success: true as const, nextType };
};

export const validateWeightedPoolEntries = (input: {
    entries: WeightedHabitusPoolEntry[];
    habitusIndex: Record<string, HabitusDefinition>;
    habitusType: HabitusTypeId;
}) => {
    const seen = new Set<string>();
    const duplicateIds: string[] = [];
    const unknownIds: string[] = [];
    const incompatibleIds: string[] = [];
    const validEntries: WeightedHabitusPoolEntry[] = [];
    input.entries.forEach((entry) => {
        if (seen.has(entry.habitusId)) {
            duplicateIds.push(entry.habitusId);
            return;
        }
        seen.add(entry.habitusId);
        const definition = input.habitusIndex[entry.habitusId];
        if (!definition) {
            unknownIds.push(entry.habitusId);
            return;
        }
        if (definition.type !== input.habitusType) {
            incompatibleIds.push(entry.habitusId);
            return;
        }
        validEntries.push(entry);
    });
    return {
        validEntries,
        duplicateIds,
        unknownIds,
        incompatibleIds,
    };
};
