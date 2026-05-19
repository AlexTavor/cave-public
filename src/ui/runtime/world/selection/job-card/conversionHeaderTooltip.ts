import type { AbilityEffectModel } from "../ability-display/abilityDisplay.types";

export const buildConversionHeaderTooltip = (effects: AbilityEffectModel[]) => {
    const outputs = effects.filter((effect) => effect.tone === "positive");
    if (outputs.length === 0) return {};
    if (outputs.length === 1) {
        return {
            tooltipTitle: outputs[0].tooltipTitle,
            tooltipLines: outputs[0].tooltipLines,
        };
    }
    return {
        tooltipTitle: "Produced on cycle completion",
        tooltipLines: outputs.flatMap((effect) => [
            effect.label,
            ...effect.tooltipLines,
        ]),
    };
};
