import type { AttributeSet } from "../../data/schemas/game/body";
import type { HabitusDefinition } from "../../data/schemas/game/habiti";

const emptyAttributes = (): AttributeSet => ({ body: 0, mind: 0, social: 0 });
const sortIds = (ids: string[] = []) =>
    [...new Set(ids)].sort((left, right) => left.localeCompare(right));

export const resolveOwnedHabitiEffects = (input: {
    ownedHabiti: string[];
    habitusIndex: Record<string, HabitusDefinition>;
    onUnknownId?: (id: string) => void;
}) => {
    const attributeBonuses = emptyAttributes();
    const resourceGainMultipliers: Record<string, number> = {};
    const producerOutputTagMultipliers: Record<string, number> = {};
    const ownedHabiti: HabitusDefinition[] = [];
    let absorptionXpConversionBonus = 0;

    sortIds(input.ownedHabiti).forEach((id) => {
        const definition = input.habitusIndex[id];
        if (!definition) {
            input.onUnknownId?.(id);
            return;
        }
        ownedHabiti.push(definition);
        definition.effects.forEach((effect) => {
            if (effect.type === "add_cave_attribute") {
                attributeBonuses[effect.attribute] += effect.amount;
                return;
            }
            if (effect.type === "add_absorption_xp_conversion") {
                absorptionXpConversionBonus += effect.amount;
                return;
            }
            if (effect.type === "add_resource_gain_multiplier") {
                resourceGainMultipliers[effect.resource] =
                    (resourceGainMultipliers[effect.resource] ?? 0) +
                    effect.amount;
                return;
            }
            if (effect.type !== "add_producer_output_multiplier") return;
            producerOutputTagMultipliers[effect.producerTag] =
                (producerOutputTagMultipliers[effect.producerTag] ?? 0) +
                effect.amount;
        });
    });

    return {
        attributeBonuses,
        absorptionXpConversionBonus,
        producerOutputTagMultipliers,
        resourceGainMultipliers,
        ownedHabiti,
    };
};
