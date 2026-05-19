import type {
    HabitusDefinition,
    HabitusTypeRule,
} from "../../../../../data/schemas/game/habiti";
import { HABITUS_TYPES } from "./habitusTypes";

export const findFirstMissingHabitusType = (rules: HabitusTypeRule[]) =>
    HABITUS_TYPES.find(
        (type) => !rules.some((rule) => rule.habitusType === type),
    ) ?? null;

export const removeHabitusFromPools = (rules: HabitusTypeRule[], id: string) =>
    rules.map((rule) => ({
        ...rule,
        weightedPool: rule.weightedPool.filter(
            (entry) => entry.habitusId !== id,
        ),
    }));

export const renameHabitusInPools = (
    rules: HabitusTypeRule[],
    oldId: string,
    nextId: string,
) =>
    rules.map((rule) => ({
        ...rule,
        weightedPool: rule.weightedPool.map((entry) =>
            entry.habitusId === oldId ? { ...entry, habitusId: nextId } : entry,
        ),
    }));

export const prunePoolsAgainstRegistry = (
    rules: HabitusTypeRule[],
    habitusIndex: Record<string, HabitusDefinition>,
) =>
    rules.map((rule) => ({
        ...rule,
        weightedPool: rule.weightedPool.filter(
            (entry) => habitusIndex[entry.habitusId]?.type === rule.habitusType,
        ),
    }));

export const countPoolEntries = (rules: HabitusTypeRule[]) =>
    rules.reduce((sum, rule) => sum + rule.weightedPool.length, 0);
