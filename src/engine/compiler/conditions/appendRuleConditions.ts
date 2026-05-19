import type { BehaviorRule } from "../../../data/schemas/behavior";
import { compileConditionText } from "./compileConditionText";

const isEmpty = (value: string): boolean => value.trim().length === 0;

export const appendRuleConditions = (
    rule: BehaviorRule,
    conditionTexts: string[] | undefined,
    contextLabel: string,
): void => {
    if (!conditionTexts || conditionTexts.length === 0) return;
    rule.conditions ??= [];

    conditionTexts.forEach((condText, index) => {
        if (isEmpty(condText)) return;
        const result = compileConditionText(condText);
        if (result.ok) {
            rule.conditions.push({
                id: `gate_${rule.id}_${index}`,
                sortKey: `z_gate_${index}`,
                tokens: result.tokens,
            });
            return;
        }
        console.warn(`Condition error in ${contextLabel}: ${result.error}`);
    });
};
