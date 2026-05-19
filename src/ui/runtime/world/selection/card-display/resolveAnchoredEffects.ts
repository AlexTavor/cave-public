import type {
    EntityModifierLabel,
    EntityTraitSummary,
} from "../entityAnalysis/entityAnalysis.types";
import {
    formatFullEffectValue,
    formatModifierSourceValue,
    resolveBodyEffectIconId,
} from "../components/effectPillPresentation";
import {
    formatEffectSegmentText,
    resolveEffectTone,
} from "./cardDisplayFormatters";
import type {
    CapsuleEffectSegmentModel,
    ValueCapsuleModel,
} from "./cardDisplayTypes";

const append = (
    byTarget: Record<string, CapsuleEffectSegmentModel[]>,
    targetKey: string,
    effect: CapsuleEffectSegmentModel,
) => {
    byTarget[targetKey] = [...(byTarget[targetKey] ?? []), effect];
};

export const resolveAnchoredEffects = (input: {
    modifiers: EntityModifierLabel[];
    traits: EntityTraitSummary[];
    localTargets: string[];
}) => {
    const localTargets = new Set(input.localTargets);
    const byTarget: Record<string, CapsuleEffectSegmentModel[]> = {};
    const residualEffects: ValueCapsuleModel[] = [];

    input.modifiers.forEach((modifier, index) => {
        const text = formatEffectSegmentText(
            modifier.valueStr,
            modifier.intervalStr,
        );
        const segment = {
            id: `modifier:${modifier.sourceId}:${index}`,
            text,
            tone: resolveEffectTone(text),
            sourceLabel: modifier.sourceId,
            targetKey: modifier.targetKey,
        } as const;
        if (localTargets.has(modifier.targetKey)) {
            append(byTarget, modifier.targetKey, segment);
            return;
        }
        residualEffects.push({
            id: segment.id,
            skin: "modifier",
            iconId: resolveBodyEffectIconId(modifier.targetKey),
            title: modifier.targetKey,
            effects: [segment],
            tooltip: {
                title: modifier.targetKey,
                lines: [
                    formatModifierSourceValue(
                        modifier.valueStr,
                        modifier.intervalStr,
                        modifier.sourceId,
                    ),
                ],
            },
        });
    });

    input.traits.forEach((trait) => {
        trait.effects.forEach((effect, index) => {
            const text = formatEffectSegmentText(
                effect.valueStr,
                effect.intervalStr,
            );
            const segment = {
                id: `${trait.traitId}:${index}`,
                text,
                tone: resolveEffectTone(text),
                sourceLabel: trait.label,
                targetKey: effect.targetKey,
            } as const;
            if (localTargets.has(effect.targetKey)) {
                append(byTarget, effect.targetKey, segment);
                return;
            }
            residualEffects.push({
                id: segment.id,
                skin: "modifier",
                iconId: resolveBodyEffectIconId(effect.targetKey),
                title: trait.label,
                effects: [segment],
                tooltip: {
                    title: trait.label,
                    lines: [
                        formatFullEffectValue(
                            effect.valueStr,
                            effect.intervalStr,
                            effect.targetKey,
                        ),
                        ...(trait.description ? [trait.description] : []),
                    ],
                },
            });
        });
    });

    return { byTarget, residualEffects };
};
