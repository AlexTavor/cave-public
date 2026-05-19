import type { HabitusEffect } from "../../data/schemas/game/habiti";

export type HabitusEffectDescriptionFailureReason =
    | "missing_resource"
    | "missing_producer_tag";

export type HabitusEffectDescriptionResult =
    | { ok: true; description: string }
    | { ok: false; reason: HabitusEffectDescriptionFailureReason };

const hasRequiredText = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

const capitalizeLabel = (value: string) =>
    value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

const formatNumeric = String;

const formatPercent = (amount: number) => `${formatNumeric(amount * 100)}%`;

export const generateHabitusEffectDescription = (
    effect: HabitusEffect,
): HabitusEffectDescriptionResult => {
    switch (effect.type) {
        case "add_cave_attribute":
            return {
                ok: true,
                description: `+${formatNumeric(effect.amount)} [icon=attr_${effect.attribute}]${capitalizeLabel(effect.attribute)}`,
            };
        case "add_absorption_xp_conversion":
            return {
                ok: true,
                description: `+${formatPercent(effect.amount)} [icon=xp]XP`,
            };
        case "add_resource_gain_multiplier":
            if (!hasRequiredText(effect.resource)) {
                return { ok: false, reason: "missing_resource" };
            }
            return {
                ok: true,
                description: `+${formatPercent(effect.amount)} [icon=${effect.resource}]${capitalizeLabel(effect.resource)}`,
            };
        case "add_producer_output_multiplier":
            if (!hasRequiredText(effect.producerTag)) {
                return { ok: false, reason: "missing_producer_tag" };
            }
            return {
                ok: true,
                description: `+${formatPercent(effect.amount)} to all [icon=${effect.producerTag}]${capitalizeLabel(effect.producerTag)} production`,
            };
        case "increase_max_purge":
            return {
                ok: true,
                description: `+${formatNumeric(effect.amount)} max [color=gold]Suspicion[/color] - delays the Purge`,
            };
    }
};
