import type {
    HabitusDefinition,
    HabitusEffect,
    HabitusTypeId,
    HabitusTypeRule,
} from "../../../../../data/schemas/game/habiti";

export const createDefaultHabitus = (id: string): HabitusDefinition => ({
    id,
    label: "New Habitus",
    description: "",
    summary: "",
    type: "unique_body",
    effects: [],
    excludes: [],
});

export const createDefaultHabitusEffect = (): HabitusEffect => ({
    type: "add_cave_attribute",
    attribute: "body",
    amount: 1,
    description: "",
});

export const createDefaultHabitusTypeRule = (
    habitusType: HabitusTypeId,
): HabitusTypeRule => ({
    habitusType,
    probability: 1,
    maxCount: 1,
    weightedPool: [],
});
