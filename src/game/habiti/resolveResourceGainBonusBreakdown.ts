import type { HabitusDefinition } from "../../data/schemas/game/habiti";
import type { UnderstandingDefinition } from "../../data/schemas/game/understanding";

const byText = (left: string, right: string) => left.localeCompare(right);
const sortIds = (ids: string[]) => [...new Set(ids)].sort(byText);

export type ResourceGainContribution = {
    habitusId: string;
    label: string;
    delta: number;
    descriptions: string[];
};

const collectContribution = (input: {
    definition:
        | Pick<HabitusDefinition, "id" | "label">
        | Pick<UnderstandingDefinition, "id" | "label">;
    delta: number;
    descriptions: string[];
}) =>
    input.delta === 0
        ? []
        : [
              {
                  habitusId: input.definition.id,
                  label: input.definition.label,
                  delta: input.delta,
                  descriptions: input.descriptions,
              } satisfies ResourceGainContribution,
          ];

export const resolveResourceGainBonusBreakdown = (input: {
    resource: string;
    ownedHabiti: string[];
    ownedUnderstanding?: string[];
    producerTags?: string[];
    habitusIndex: Record<string, HabitusDefinition>;
    understandingIndex?: Record<string, UnderstandingDefinition>;
    onUnknownHabitusId?: (id: string) => void;
    onUnknownUnderstandingId?: (id: string) => void;
}) => {
    const collectFromIds = (
        ids: string[],
        index: Record<string, HabitusDefinition | UnderstandingDefinition>,
        onUnknownId?: (id: string) => void,
    ) =>
        sortIds(ids).flatMap((id) => {
            const definition = index[id];
            if (!definition) {
                onUnknownId?.(id);
                return [];
            }
            const resourceMatches = definition.effects.filter(
                (effect) =>
                    effect.type === "add_resource_gain_multiplier" &&
                    effect.resource === input.resource,
            );
            const producerMatches = definition.effects.filter(
                (effect) =>
                    effect.type === "add_producer_output_multiplier" &&
                    (input.producerTags ?? []).includes(effect.producerTag),
            );
            return [
                ...collectContribution({
                    definition,
                    delta: resourceMatches.reduce(
                        (sum, effect) => sum + effect.amount,
                        0,
                    ),
                    descriptions: resourceMatches.flatMap((effect) =>
                        effect.description ? [effect.description] : [],
                    ),
                }),
                ...collectContribution({
                    definition,
                    delta: producerMatches.reduce(
                        (sum, effect) => sum + effect.amount,
                        0,
                    ),
                    descriptions: producerMatches.flatMap((effect) =>
                        effect.description ? [effect.description] : [],
                    ),
                }),
            ];
        });

    const contributions = [
        ...collectFromIds(
            input.ownedHabiti,
            input.habitusIndex,
            input.onUnknownHabitusId,
        ),
        ...collectFromIds(
            input.ownedUnderstanding ?? [],
            input.understandingIndex ?? {},
            input.onUnknownUnderstandingId,
        ),
    ].sort(
        (left, right) =>
            byText(left.label, right.label) ||
            byText(left.habitusId, right.habitusId),
    );

    return {
        totalDelta: contributions.reduce((sum, item) => sum + item.delta, 0),
        contributions,
    };
};
