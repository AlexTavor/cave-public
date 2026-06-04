import type { HabitusDefinition } from "../../data/schemas/game/habiti";
import type { UnderstandingDefinition } from "../../data/schemas/game/understanding";
import { resourceGainBonusStateKey } from "../../utils/habitiBonusStateKeys";

const byText = (left: string, right: string) => left.localeCompare(right);

const listDefinitions = (
    habitusIndex: Record<string, HabitusDefinition>,
    understandingIndex: Record<string, UnderstandingDefinition>,
) => [
    ...Object.values(habitusIndex ?? {}),
    ...Object.values(understandingIndex ?? {}),
];

export const listResourceGainBonusResources = (
    habitusIndex: Record<string, HabitusDefinition>,
    understandingIndex: Record<string, UnderstandingDefinition> = {},
) =>
    [
        ...new Set(
            listDefinitions(habitusIndex, understandingIndex).flatMap(
                (definition) =>
                    definition.effects.flatMap((effect) =>
                        effect.type === "add_resource_gain_multiplier"
                            ? [effect.resource]
                            : [],
                    ),
            ),
        ),
    ].sort(byText);

export const readResourceGainBonusValue = (
    world: unknown,
    resource: string,
): number => {
    const key = resourceGainBonusStateKey(resource);
    const entry = (world as { state?: Record<string, { value?: unknown }> })
        ?.state?.[key];
    return typeof entry?.value === "number" ? entry.value : 0;
};
