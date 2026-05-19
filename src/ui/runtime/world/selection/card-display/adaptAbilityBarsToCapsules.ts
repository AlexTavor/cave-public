import type { AbilityBarModel } from "../ability-display/abilityDisplay.types";
import { resolveEffectTone } from "./cardDisplayFormatters";
import type { CapsuleValueModel, ValueCapsuleModel } from "./cardDisplayTypes";

const toValue = (model: AbilityBarModel): CapsuleValueModel => {
    if ("valueBinding" in model && model.valueBinding) {
        return { binding: model.valueBinding };
    }
    return { text: "valueText" in model ? model.valueText : "" };
};

export const adaptAbilityBarsToCapsules = (
    models: AbilityBarModel[],
): ValueCapsuleModel[] =>
    models.map((model) => ({
        id: model.id,
        skin: "value",
        iconId: model.iconId,
        title: model.title,
        value: toValue(model),
        effects: model.titleMetaText
            ? [
                  {
                      id: `${model.id}:meta`,
                      text: model.titleMetaText,
                      tone: resolveEffectTone(model.titleMetaText),
                  },
              ]
            : [],
        tooltip: { title: model.tooltipTitle, lines: model.tooltipLines },
        progress: {
            id: model.id,
            entityId: model.entityId,
            valuePath: model.valuePath,
            ...(model.maxPath
                ? { maxPath: model.maxPath }
                : { maxValue: model.maxValue ?? model.max }),
            color: model.color,
        },
    }));
