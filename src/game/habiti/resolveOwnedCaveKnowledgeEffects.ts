import type { HabitusDefinition } from "../../data/schemas/game/habiti";
import type { AttributeSet } from "../../data/schemas/game/body";
import type { UnderstandingDefinition } from "../../data/schemas/game/understanding";

const emptyAttributes = (): AttributeSet => ({ body: 0, mind: 0, social: 0 });
const sortIds = (ids: string[]) =>
    [...new Set(ids)].sort((left, right) => left.localeCompare(right));

const applyEffects = (
    definition: { effects: HabitusDefinition["effects"] },
    totals: {
        attributeBonuses: AttributeSet;
        absorptionXpConversionBonus: number;
        purgeProgressMaxBonus: number;
        producerOutputTagMultipliers: Record<string, number>;
        resourceGainMultipliers: Record<string, number>;
    },
) => {
    definition.effects.forEach((effect) => {
        switch (effect.type) {
            case "add_cave_attribute":
                totals.attributeBonuses[effect.attribute] += effect.amount;
                return;
            case "add_absorption_xp_conversion":
                totals.absorptionXpConversionBonus += effect.amount;
                return;
            case "add_resource_gain_multiplier":
                totals.resourceGainMultipliers[effect.resource] =
                    (totals.resourceGainMultipliers[effect.resource] ?? 0) +
                    effect.amount;
                return;
            case "increase_max_purge":
                totals.purgeProgressMaxBonus += effect.amount;
                return;
            case "add_producer_output_multiplier":
                totals.producerOutputTagMultipliers[effect.producerTag] =
                    (totals.producerOutputTagMultipliers[effect.producerTag] ??
                        0) + effect.amount;
        }
    });
};

export const resolveOwnedCaveKnowledgeEffects = (input: {
    ownedHabiti: string[];
    habitusIndex: Record<string, HabitusDefinition>;
    ownedUnderstanding: string[];
    understandingIndex: Record<string, UnderstandingDefinition>;
    onUnknownHabitusId?: (id: string) => void;
    onUnknownUnderstandingId?: (id: string) => void;
}) => {
    const resolvedHabiti: HabitusDefinition[] = [];
    const resolvedUnderstanding: UnderstandingDefinition[] = [];
    const totals = {
        attributeBonuses: emptyAttributes(),
        absorptionXpConversionBonus: 0,
        purgeProgressMaxBonus: 0,
        producerOutputTagMultipliers: {} as Record<string, number>,
        resourceGainMultipliers: {} as Record<string, number>,
    };

    sortIds(input.ownedHabiti).forEach((id) => {
        const definition = input.habitusIndex[id];
        if (!definition) return input.onUnknownHabitusId?.(id);
        resolvedHabiti.push(definition);
        applyEffects(definition, totals);
    });
    sortIds(input.ownedUnderstanding).forEach((id) => {
        const definition = input.understandingIndex[id];
        if (!definition) return input.onUnknownUnderstandingId?.(id);
        resolvedUnderstanding.push(definition);
        applyEffects(definition, totals);
    });

    return { ...totals, resolvedHabiti, resolvedUnderstanding };
};
