import type { Blueprint } from "../../../data/schemas/blueprint";
import type { UpdaterAbilityConfig } from "../../../data/schemas/abilities/updater";
import type { ConditionalActivationAbilityValue } from "../../../data/schemas/abilities/conditionalActivation";
import { appendRuleConditions } from "../conditions/appendRuleConditions";
import { buildAbilityTriggerConditions } from "./abilityTriggerConditions";
import { appendConditionalActivationActiveStates } from "./conditionalActivationCompiler";
import { requiresCycleTrigger } from "./requiresCycleTrigger";

export const updaterCompiler = (
    draft: Blueprint,
    config: UpdaterAbilityConfig,
    index: number,
    conditionalActivation?: ConditionalActivationAbilityValue,
): void => {
    const op = config.op ?? "ADD";
    const value = (config.value ?? 1) as any;
    const triggers = config.triggers ?? ["cycle_complete"];
    if (requiresCycleTrigger(triggers) && !draft.components?.state?.cycle) {
        console.warn(`Updater ability requires cycle on '${draft.id}'.`);
    }
    const rule = {
        id: `sys_updater_${index}`,
        sortKey: `45_updater_${index}`,
        conditions: buildAbilityTriggerConditions(triggers),
        actions: [
            {
                type: "MUTATE" as const,
                target: config.target,
                op,
                value,
            },
        ],
    };

    appendRuleConditions(rule, config.conditions, `${draft.id}:updater`);
    appendConditionalActivationActiveStates(rule, conditionalActivation, {
        ability: "updater",
        targetId: config.id,
    });

    draft.components ??= {} as Blueprint["components"];
    draft.components.behavior ??= { rules: [] };
    draft.components.behavior.rules ??= [];
    draft.components.behavior.rules.push(rule);
};

