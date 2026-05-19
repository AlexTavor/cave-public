import type { Blueprint } from "../../../data/schemas/blueprint";
import type { ConversionAbilityConfig } from "../../../data/schemas/abilities/conversion";
import type { ConditionalActivationAbilityValue } from "../../../data/schemas/abilities/conditionalActivation";
import {
    createConversionRule,
    removeCycleResetRule,
    addInputConditionsToCycleRule,
} from "./conversionCompilerUtils";
import { buildInputGateDemandRules } from "./conversionInputGate";
import { appendRuleConditions } from "../conditions/appendRuleConditions";
import { appendConditionalActivationActiveStates } from "./conditionalActivationCompiler";
import {
    compileConversionInputAmount,
    compileConversionOutputAmount,
} from "./conversionCompilerAmounts";
import { requiresCycleTrigger } from "./requiresCycleTrigger";

export const conversionCompiler = (
    draft: Blueprint,
    config: ConversionAbilityConfig,
    index: number,
    conditionalActivation?: ConditionalActivationAbilityValue,
): void => {
    const triggers = config.triggers ?? ["cycle_complete"];
    if (requiresCycleTrigger(triggers) && !draft.components?.state?.cycle) {
        console.warn(`Conversion ability requires cycle on '${draft.id}'.`);
    }

    if (config.resetCycle === false) {
        removeCycleResetRule(draft);
    }

    const inputRefs: Array<{ resource: string; amountRef: string }> = [];
    const outputRefs: Array<{
        resource: string;
        amountRef: string;
        target: string;
    }> = [];

    (config.inputs ?? []).forEach((input, inputIndex) => {
        const resource = input.resource?.trim();
        if (!resource) {
            console.warn(`Conversion input missing resource on '${draft.id}'.`);
            return;
        }
        inputRefs.push({
            resource,
            amountRef: compileConversionInputAmount({
                draft,
                resource,
                conversionIndex: index,
                inputIndex,
                amount: input.amount,
            }),
        });
    });

    (config.outputs ?? []).forEach((output, outputIndex) => {
        const resource = output.resource?.trim();
        if (!resource) {
            console.warn(
                `Conversion output missing resource on '${draft.id}'.`,
            );
            return;
        }
        outputRefs.push({
            resource,
            amountRef: compileConversionOutputAmount({
                draft,
                resource,
                conversionIndex: index,
                outputIndex,
                amount: output.amount,
            }),
            target: output.target?.trim() || "self",
        });
    });

    if (inputRefs.length === 0 && outputRefs.length === 0) return;

    draft.components ??= {} as Blueprint["components"];
    draft.components.behavior ??= { rules: [] };
    draft.components.behavior.rules ??= [];
    const rules = draft.components.behavior.rules;
    if (inputRefs.length > 0) {
        addInputConditionsToCycleRule(draft, inputRefs);
        buildInputGateDemandRules(draft, inputRefs, index).forEach((r) =>
            rules.push(r),
        );
    }
    const rule = createConversionRule({
        id: config.id?.trim() || "default",
        index,
        inputRefs,
        outputRefs,
        resetCycle: config.resetCycle !== false,
        triggers,
    });
    appendRuleConditions(rule, config.conditions, `${draft.id}:conversion`);
    appendConditionalActivationActiveStates(rule, conditionalActivation, {
        ability: "conversion",
        targetId: config.id,
    });
    rules.push(rule);
};

