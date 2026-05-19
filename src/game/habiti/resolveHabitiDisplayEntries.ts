import type { HabitusDefinition } from "../../data/schemas/game/habiti";
import { resolveHabitusEffectDescriptions } from "./formatHabitusEffectSummary";

export type HabitiDisplayEntry = {
    id: string;
    label: string;
    description: string;
    summary: string;
    effectDescriptions: string[];
    isOwnedByCave: boolean;
};
export type HabitiDisplayMode = "body" | "cave";

export const resolveHabitiDisplayEntries = (input: {
    ids: string[];
    ownedHabiti?: string[];
    habitusIndex: Record<string, HabitusDefinition>;
    mode: HabitiDisplayMode;
}) => {
    const owned = new Set(input.ownedHabiti ?? []);
    return [...new Set(input.ids)]
        .map((id) => {
            const definition = input.habitusIndex[id];
            const isCaveMode = input.mode === "cave";
            return {
                id,
                label: definition?.label ?? id,
                description: definition?.description ?? "",
                summary: isCaveMode ? (definition?.summary ?? "") : "",
                effectDescriptions: isCaveMode
                    ? resolveHabitusEffectDescriptions(
                          definition?.effects ?? [],
                      )
                    : [],
                isOwnedByCave: owned.has(id),
            };
        })
        .sort(
            (left, right) =>
                left.label.localeCompare(right.label) ||
                left.id.localeCompare(right.id),
        );
};
