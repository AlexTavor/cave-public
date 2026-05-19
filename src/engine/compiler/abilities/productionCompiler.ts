import type { Blueprint } from "../../../data/schemas/blueprint";
import type { ProductionAbilityConfig } from "../../../data/schemas/abilities/production";
import type { ConditionalActivationAbilityValue } from "../../../data/schemas/abilities/conditionalActivation";
import { compileScalableValue } from "../utils/scalableCompiler";
import { appendRuleConditions } from "../conditions/appendRuleConditions";
import { appendConditionalActivationActiveStates } from "./conditionalActivationCompiler";
import {
    productionBaseAmountKey,
    productionFinalAmountKey,
} from "./resourceGainAmountKeys";
import { appendResourceGainAdjustedAmount } from "./resourceGainAmountCompiler";
import { createProductionRule } from "./productionCompilerRule";
import { requiresCycleTrigger } from "./requiresCycleTrigger";

export const productionCompiler = (
    draft: Blueprint,
    config: ProductionAbilityConfig,
    index: number,
    conditionalActivation?: ConditionalActivationAbilityValue,
): void => {
    const resource = config.resource?.trim();
    const triggers = config.triggers ?? ["cycle_complete"];
    if (!resource) {
        console.warn(`Production ability missing resource on '${draft.id}'.`);
        return;
    }

    if (requiresCycleTrigger(triggers) && !draft.components?.state?.cycle) {
        console.warn(
            `Production ability requires cycle state on '${draft.id}'.`,
        );
    }

    const target = config.target || `tag:storage:${resource}`;
    const amount = {
        base: config.amount?.base ?? 0,
        perBody: config.amount?.perBody ?? 0,
        multPerBody: config.amount?.multPerBody ?? 0,
    };
    const baseKey = productionBaseAmountKey(resource, index);
    const finalKey = productionFinalAmountKey(resource, index);

    draft.components ??= {} as Blueprint["components"];
    draft.components.state ??= {};
    draft.components.state[baseKey] ??= { value: 0, visible: false };
    draft.components.state[finalKey] ??= { value: 0, visible: false };

    if (target !== "self") {
        draft.components.state[resource] ??= { value: 0, visible: false };
    }

    compileScalableValue(
        draft,
        amount,
        `self.state.${baseKey}.value`,
        `prod_${resource}_base_${index}`,
    );
    appendResourceGainAdjustedAmount({
        draft,
        resource,
        baseKey,
        finalKey,
        multiplierKey: `vals_prod_${resource}_mult_${index}`,
    });

    draft.components.behavior ??= { rules: [] };
    draft.components.behavior.rules ??= [];
    const rule = createProductionRule({
        resource,
        target,
        amountRef: `self.state.${finalKey}.value`,
        index,
        triggers,
    });
    appendRuleConditions(rule, config.conditions, `${draft.id}:production`);
    appendConditionalActivationActiveStates(rule, conditionalActivation, {
        ability: "production",
        targetId: config.id,
    });
    draft.components.behavior.rules.push(rule);
};

