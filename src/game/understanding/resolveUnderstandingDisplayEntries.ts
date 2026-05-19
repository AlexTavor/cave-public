import type { UnderstandingDefinition } from "../../data/schemas/game/understanding";
import { resolveHabitusEffectDescriptions } from "../habiti/formatHabitusEffectSummary";
import type { HabitiDisplayEntry } from "../habiti/resolveHabitiDisplayEntries";

export const resolveUnderstandingDisplayEntries = (input: {
    ids: string[];
    ownedUnderstanding?: string[];
    understandingIndex: Record<string, UnderstandingDefinition>;
}): HabitiDisplayEntry[] => {
    const owned = new Set(input.ownedUnderstanding ?? []);
    return [...new Set(input.ids)]
        .map((id) => {
            const definition = input.understandingIndex[id];
            return {
                id,
                label: definition?.label ?? id,
                description: definition?.description ?? "",
                summary: "",
                effectDescriptions: resolveHabitusEffectDescriptions(
                    definition?.effects ?? [],
                ),
                isOwnedByCave: owned.has(id),
            };
        })
        .sort(
            (left, right) =>
                left.label.localeCompare(right.label) ||
                left.id.localeCompare(right.id),
        );
};
