import type { HabitusDefinition } from "../../data/schemas/game/habiti";
import type { UnderstandingDefinition } from "../../data/schemas/game/understanding";

const byText = (left: string, right: string) => left.localeCompare(right);

export const producerOutputBonusStateKey = (tag: string) =>
    `habiti_producer_output_bonus_${tag.trim()}`;

export const listProducerOutputBonusTags = (
    habitusIndex: Record<string, HabitusDefinition>,
    understandingIndex: Record<string, UnderstandingDefinition> = {},
) =>
    [
        ...new Set(
            [
                ...Object.values(habitusIndex ?? {}),
                ...Object.values(understandingIndex ?? {}),
            ].flatMap((definition) =>
                definition.effects.flatMap((effect) =>
                    effect.type === "add_producer_output_multiplier"
                        ? [effect.producerTag]
                        : [],
                ),
            ),
        ),
    ].sort(byText);

export const readProducerOutputBonusValue = (
    world: unknown,
    tag: string,
): number => {
    const key = producerOutputBonusStateKey(tag);
    const entry = (world as { state?: Record<string, { value?: unknown }> })
        ?.state?.[key];
    return typeof entry?.value === "number" ? entry.value : 0;
};
