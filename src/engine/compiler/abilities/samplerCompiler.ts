import type { Blueprint } from "../../../data/schemas/blueprint";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import type { SamplerAbilityConfig } from "../../../data/schemas/abilities/sampler";
import type { ConditionalActivationAbilityValue } from "../../../data/schemas/abilities/conditionalActivation";
import { deriveSamplerTargetKey } from "./samplerUtils";
import { appendConditionalActivationActiveStates } from "./conditionalActivationCompiler";
import { buildAbilityTriggerConditions } from "./abilityTriggerConditions";
import { requiresCycleTrigger } from "./requiresCycleTrigger";

const createSamplerRule = (params: {
    targetKey: string;
    source: string;
    maxSource?: string;
    index: number;
    triggers: NonNullable<SamplerAbilityConfig["triggers"]>;
}): BehaviorRule => {
    const actions = [
        {
            type: "MUTATE" as const,
            target: `self.state.${params.targetKey}.value`,
            op: "SET" as const,
            value: params.source,
        },
    ];

    if (params.maxSource) {
        actions.push({
            type: "MUTATE" as const,
            target: `self.state.${params.targetKey}.max`,
            op: "SET" as const,
            value: params.maxSource,
        });
    }

    return {
        id: `sys_sampler_${params.targetKey}_${params.index}`,
        sortKey: "sys_075",
        conditions: buildAbilityTriggerConditions(params.triggers),
        actions,
    };
};

export const samplerCompiler = (
    draft: Blueprint,
    config: SamplerAbilityConfig,
    index: number,
    conditionalActivation?: ConditionalActivationAbilityValue,
): void => {
    const source = config.source?.trim();
    const triggers = config.triggers ?? ["cycle_complete"];
    if (!source) {
        console.warn(`Sampler ability missing source on '${draft.id}'.`);
        return;
    }

    if (requiresCycleTrigger(triggers) && !draft.components?.state?.cycle) {
        console.warn(`Sampler ability requires cycle on '${draft.id}'.`);
    }

    const derivedTarget = deriveSamplerTargetKey(source);
    const targetKey = (derivedTarget ?? config.target)?.trim();
    if (!targetKey) {
        console.warn(`Sampler ability missing target on '${draft.id}'.`);
        return;
    }

    const maxSource = source.endsWith(".value")
        ? source.replace(/\.value$/, ".max")
        : undefined;

    draft.components ??= {} as Blueprint["components"];
    draft.components.state ??= {};
    draft.components.state[targetKey] = {
        value: 0,
        visible: config.visible ?? true,
        max: config.max ?? 100,
    };

    draft.components.behavior ??= { rules: [] };
    draft.components.behavior.rules ??= [];
    const rule = createSamplerRule({
        targetKey,
        source,
        maxSource,
        index,
        triggers,
    });
    appendConditionalActivationActiveStates(rule, conditionalActivation, {
        ability: "sampler",
        targetId: config.id,
    });
    draft.components.behavior.rules.push(rule);
};

