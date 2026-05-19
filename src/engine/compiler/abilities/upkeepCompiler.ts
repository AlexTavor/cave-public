import type { Blueprint } from "../../../data/schemas/blueprint";
import type { UpkeepAbilityConfig } from "../../../data/schemas/abilities/upkeep";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import { Op } from "../../../data/schemas/primitives";
import { compileScalableValue } from "../utils/scalableCompiler";
import { ensureStateEntry, createTraitToggleRule } from "./upkeepCompilerUtils";
import { buildUpkeepRequestRule } from "./upkeepRequestRuleBuilder";

const compileUpkeepPassiveEffects = (
    draft: Blueprint,
    rateKey: string,
    demandKey: string,
): void => {
    draft.components!.passiveEffects!.push(
        {
            op: Op.SET,
            target: `self.state.${demandKey}.value`,
            source: `self.state.${rateKey}.value`,
        },
        {
            op: Op.MULT,
            target: `self.state.${demandKey}.value`,
            source: `global.dt_s`,
        },
    );
};

const compileUpkeepConsumeRule = (
    resource: string,
    demandKey: string,
    index: number,
): BehaviorRule => ({
    id: `sys_upkeep_consume_${resource}_${index}`,
    sortKey: "sys_060",
    conditions: [],
    actions: [
        {
            type: "MUTATE",
            target: `self.state.${resource}.value`,
            op: "SUB",
            value: `self.state.${demandKey}.value`,
        },
    ],
});

export const upkeepCompiler = (
    draft: Blueprint,
    config: UpkeepAbilityConfig,
    index: number,
): void => {
    const resource = config.resource?.trim();
    if (!resource) {
        console.warn(`Upkeep ability missing resource on '${draft.id}'.`);
        return;
    }

    draft.components ??= {} as Blueprint["components"];
    const components = draft.components;
    components.state ??= {};

    ensureStateEntry(draft, resource);

    const rateKey = `vals_upkeep_rate_${resource}_${index}`;
    const demandKey = `upkeep_${resource}_demand_${index}`;

    ensureStateEntry(draft, rateKey);
    ensureStateEntry(draft, demandKey);

    compileScalableValue(
        draft,
        config.rate,
        `self.state.${rateKey}.value`,
        `upkeep_rate_${index}`,
    );

    components.passiveEffects ??= [];
    compileUpkeepPassiveEffects(draft, rateKey, demandKey);

    components.behavior ??= { rules: [] };
    components.behavior.rules ??= [];

    const traitId = config.failureTrait;

    const rules: BehaviorRule[] = [
        compileUpkeepConsumeRule(resource, demandKey, index),
        createTraitToggleRule({
            id: `sys_upkeep_trait_on_${resource}_${index}`,
            resource,
            traitId,
            op: "<=",
        }),
        createTraitToggleRule({
            id: `sys_upkeep_trait_off_${resource}_${index}`,
            resource,
            traitId,
            op: ">",
        }),
    ];

    if (config.autoRequest) {
        const source = config.requestSource ?? `tag:storage:${resource}`;
        rules.push(
            buildUpkeepRequestRule(resource, index, source, config.isImmediate),
        );
    }

    components.behavior.rules.push(...rules);

    draft.tags ??= [];
    const tag = `susceptible_to_${traitId}`;
    if (!draft.tags.includes(tag)) draft.tags.push(tag);
};

