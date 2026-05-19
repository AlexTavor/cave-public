import type { Blueprint } from "../../../data/schemas/blueprint";
import type { DraftAbilityConfig } from "../../../data/schemas/abilities/draft";
import type { ConditionalActivationAbilityValue } from "../../../data/schemas/abilities/conditionalActivation";
import type {
    BehaviorAction,
    BehaviorRule,
} from "../../../data/schemas/behavior";
import { appendRuleConditions } from "../conditions/appendRuleConditions";
import { buildAbilityTriggerConditions } from "./abilityTriggerConditions";
import { appendConditionalActivationActiveStates } from "./conditionalActivationCompiler";
import { requiresCycleTrigger } from "./requiresCycleTrigger";

export const draftCompiler = (
    draft: Blueprint,
    config: DraftAbilityConfig,
    index: number,
    conditionalActivation?: ConditionalActivationAbilityValue,
): void => {
    const poolId = config.poolId?.trim();
    const triggers = config.triggers ?? ["cycle_complete"];
    if (!poolId) {
        console.warn(`Draft ability missing poolId on '${draft.id}'.`);
        return;
    }

    if (requiresCycleTrigger(triggers) && !draft.components?.state?.cycle) {
        console.warn(`Draft ability requires cycle on '${draft.id}'.`);
    }

    const rule: BehaviorRule = {
        id: `sys_draft_${poolId}_${index}`,
        sortKey: "sys_070",
        conditions: buildAbilityTriggerConditions(triggers),
        actions: [
            {
                type: "TRIGGER_DRAFT" as const,
                poolId: config.poolId,
                count: config.count,
                label: config.label,
                triggerEntityId: "self",
                ...(config.onComplete === undefined
                    ? {}
                    : { onComplete: config.onComplete as BehaviorAction[] }),
            },
        ],
    };

    appendRuleConditions(rule, config.conditions, `${draft.id}:draft`);
    appendConditionalActivationActiveStates(rule, conditionalActivation, {
        ability: "draft",
        targetId: config.id,
    });

    draft.components ??= {} as Blueprint["components"];
    draft.components.behavior ??= { rules: [] };
    draft.components.behavior.rules ??= [];
    draft.components.behavior.rules.push(rule);
};

