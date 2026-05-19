import type { ConditionalActivationAbilityValue } from "../../../data/schemas/abilities/conditionalActivation";
import type { TriggeredActionsAbilityConfig } from "../../../data/schemas/abilities/triggeredActions";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import type { Blueprint } from "../../../data/schemas/blueprint";
import { appendRuleConditions } from "../conditions/appendRuleConditions";
import { buildAbilityTriggerConditions } from "./abilityTriggerConditions";
import { appendConditionalActivationActiveStates } from "./conditionalActivationCompiler";
import { requiresCycleTrigger } from "./requiresCycleTrigger";

export const triggeredActionsCompiler = (
    draft: Blueprint,
    config: TriggeredActionsAbilityConfig,
    index: number,
    conditionalActivation?: ConditionalActivationAbilityValue,
): void => {
    const triggers = config.triggers ?? ["cycle_complete"];
    if (requiresCycleTrigger(triggers) && !draft.components?.state?.cycle) {
        console.warn(
            `Triggered Actions ability requires cycle on '${draft.id}'.`,
        );
    }

    const rule: BehaviorRule = {
        id: `sys_triggered_actions_${config.id || index}`,
        sortKey: `46_triggered_actions_${index}`,
        conditions: buildAbilityTriggerConditions(triggers),
        actions: config.actions,
    };

    appendRuleConditions(
        rule,
        config.conditions,
        `${draft.id}:triggeredActions`,
    );
    appendConditionalActivationActiveStates(rule, conditionalActivation, {
        ability: "triggeredActions",
        targetId: config.id,
    });

    draft.components ??= {} as Blueprint["components"];
    draft.components.behavior ??= { rules: [] };
    draft.components.behavior.rules ??= [];
    draft.components.behavior.rules.push(rule);
};
