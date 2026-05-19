import type { EntityAnalysisResult } from "./entityAnalysis.types";

const modifiersEqual = (
    a: EntityAnalysisResult["modifiers"],
    b: EntityAnalysisResult["modifiers"],
): boolean => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const am = a[i];
        const bm = b[i];
        if (
            am.targetKey !== bm.targetKey ||
            am.valueStr !== bm.valueStr ||
            am.intervalStr !== bm.intervalStr ||
            am.sourceType !== bm.sourceType ||
            am.sourceId !== bm.sourceId
        )
            return false;
    }
    return true;
};

const traitsEqual = (
    a: EntityAnalysisResult["traits"],
    b: EntityAnalysisResult["traits"],
): boolean => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const at = a[i];
        const bt = b[i];
        if (
            at.traitId !== bt.traitId ||
            at.label !== bt.label ||
            at.remainingSeconds !== bt.remainingSeconds ||
            at.effects.length !== bt.effects.length
        )
            return false;
        for (let j = 0; j < at.effects.length; j++) {
            const ae = at.effects[j];
            const be = bt.effects[j];
            if (ae.targetKey !== be.targetKey || ae.valueStr !== be.valueStr)
                return false;
        }
    }
    return true;
};

export const analysisResultEqual = (
    a: EntityAnalysisResult | undefined,
    b: EntityAnalysisResult | undefined,
): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
        modifiersEqual(a.modifiers, b.modifiers) &&
        traitsEqual(a.traits, b.traits)
    );
};
