import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import type { ConditionalActivationTarget } from "../../../../../data/schemas/abilities/conditionalActivation";
import { isConditionalActivationTargetableAbility } from "../../../../../data/schemas/abilities/conditionalActivationSupport";
import {
    formatConditionalActivationAbilityLabel,
    getConditionalActivationTargetLabel,
} from "./conditionalActivationTargetLabels";

const ORDER = [
    "cycle",
    "storage",
    "production",
    "injection",
    "conversion",
    "upkeep",
    "assignment",
    "spawner",
    "sampler",
    "body",
    "passport",
    "worldPresence",
    "draft",
    "updater",
    "triggeredActions",
    "notifications",
] as const;

type Row = {
    rowKey: string;
    label: string;
    target?: ConditionalActivationTarget;
    checked: boolean;
    targetable: boolean;
    disabledReason?: string;
};

const isChecked = (
    targets: ConditionalActivationTarget[],
    target: ConditionalActivationTarget,
) =>
    targets.some(
        (item) =>
            item.ability === target.ability &&
            item.targetId === target.targetId,
    );

export const buildConditionalActivationTargetOptions = (
    abilities: EditorAbilities,
    targets: ConditionalActivationTarget[],
): Row[] =>
    ORDER.flatMap((ability) => {
        const value = abilities[ability];
        if (!value) return [];
        if (Array.isArray(value)) {
            return value.map((entry, index) => {
                const targetId =
                    typeof (entry as { id?: unknown }).id === "string"
                        ? String((entry as { id?: string }).id)
                        : undefined;
                const target = targetId
                    ? ({ ability, targetId } as ConditionalActivationTarget)
                    : undefined;
                const targetable =
                    isConditionalActivationTargetableAbility(ability) &&
                    !!target;
                return {
                    rowKey: target
                        ? `${ability}:${targetId}`
                        : `${ability}:${index}:${getConditionalActivationTargetLabel(ability, entry, index)}`,
                    label: getConditionalActivationTargetLabel(
                        ability,
                        entry,
                        index,
                    ),
                    target,
                    checked: target ? isChecked(targets, target) : false,
                    targetable,
                    disabledReason: targetable
                        ? undefined
                        : "Inactive semantics are not defined for this ability yet.",
                };
            });
        }
        const target = { ability } as ConditionalActivationTarget;
        const targetable = isConditionalActivationTargetableAbility(ability);
        return [
            {
                rowKey: ability,
                label: formatConditionalActivationAbilityLabel(ability),
                target,
                checked: isChecked(targets, target),
                targetable,
                disabledReason: targetable
                    ? undefined
                    : "Inactive semantics are not defined for this ability yet.",
            },
        ];
    });

export type ConditionalActivationTargetOption = Row;
