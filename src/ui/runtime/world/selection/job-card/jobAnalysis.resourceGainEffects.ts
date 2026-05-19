import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { BehaviorRule } from "../../../../../data/schemas/behavior";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import {
    conversionOutputBaseAmountKey,
    productionBaseAmountKey,
} from "../../../../../engine/compiler/abilities/resourceGainAmountKeys";
import type {
    AbilityEffectGroup,
    AbilityEffectModel,
} from "../ability-display/abilityDisplay.types";
import {
    formatEffectAmount,
    readNumericValue,
} from "../ability-display/abilityDisplay.utils";
import {
    buildResourceGainEffectTooltip,
    resourceFromTarget,
    resolveAmount,
    ruleIndex,
} from "./jobAnalysis.resourceGainRuntime";

export const buildProductionEffects = (
    entity: RuntimeEntity,
    rule: BehaviorRule,
    runtime: Runtime | null,
) => {
    const mutate = rule.actions.find(
        (action) => action.type === "MUTATE" && action.op === "ADD",
    ) as any;
    if (!mutate?.target) return [];
    const resource = resourceFromTarget(mutate.target);
    const finalAmount = resolveAmount(entity, mutate.value);
    if (finalAmount === null || finalAmount <= 0) return [];
    const baseAmount =
        readNumericValue(
            entity,
            `self.state.${productionBaseAmountKey(resource, ruleIndex(rule))}.value`,
        ) ?? finalAmount;
    return [
        {
            id: `${rule.id}:${resource}`,
            iconId: resource,
            label: resource,
            valueText: `+${formatEffectAmount(finalAmount)}`,
            tone: "positive",
            ...buildResourceGainEffectTooltip({
                entity,
                runtime,
                title: "Produced on cycle completion",
                resource,
                baseAmount,
                finalAmount,
            }),
        } satisfies AbilityEffectModel,
    ];
};

export const buildConversionGroup = (
    entity: RuntimeEntity,
    rule: BehaviorRule,
    runtime: Runtime | null,
) => {
    const sourceIndex = ruleIndex(rule);
    let outputOrdinal = 0;
    const effects = rule.actions.reduce((items, action) => {
        if (
            action.type !== "MUTATE" ||
            !action.target.startsWith("self.state.") ||
            action.target === "self.state.cycle.value"
        )
            return items;
        const isOutput = action.op === "ADD";
        const authoredOutputOrdinal = isOutput ? outputOrdinal++ : -1;
        const amount = resolveAmount(entity, action.value);
        if (amount === null || amount <= 0) return items;
        const resource = resourceFromTarget(action.target);
        const tooltip = isOutput
            ? buildResourceGainEffectTooltip({
                  entity,
                  runtime,
                  title: "Produced on cycle completion",
                  resource,
                  baseAmount:
                      readNumericValue(
                          entity,
                          `self.state.${conversionOutputBaseAmountKey(resource, sourceIndex, authoredOutputOrdinal)}.value`,
                      ) ?? amount,
                  finalAmount: amount,
              })
            : {
                  tooltipTitle: "Consumed on cycle completion",
                  tooltipLines: [rule.id],
              };
        items.push({
            id: `${rule.id}:${resource}:${action.op}`,
            iconId: resource,
            label: resource,
            valueText: `${isOutput ? "+" : "-"}${formatEffectAmount(amount)}`,
            tone: isOutput ? "positive" : "negative",
            ...tooltip,
        });
        return items;
    }, [] as AbilityEffectModel[]);
    return effects.length > 0
        ? ({
              id: rule.id,
              kind: "conversion",
              sourceIndex,
              title: "Conversion",
              effects,
          } as AbilityEffectGroup)
        : null;
};
