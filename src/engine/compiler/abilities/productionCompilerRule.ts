import type {
    BehaviorAction,
    BehaviorRule,
} from "../../../data/schemas/behavior";
import type { AbilityTriggerKind } from "../../../data/schemas/abilities/triggers";
import { buildAbilityTriggerConditions } from "./abilityTriggerConditions";

const buildProductionActions = (input: {
    resource: string;
    target: string;
    amountRef: string;
}): BehaviorAction[] =>
    input.target === "self"
        ? [
              {
                  type: "MUTATE",
                  target: `self.state.${input.resource}.value`,
                  op: "ADD",
                  value: input.amountRef,
              },
          ]
        : [
              {
                  type: "MUTATE",
                  target: `self.state.${input.resource}.value`,
                  op: "ADD",
                  value: input.amountRef,
              },
              {
                  type: "TRANSFER",
                  source: "self",
                  target: input.target,
                  resource: input.resource,
                  amount: input.amountRef,
              },
          ];

export const createProductionRule = (input: {
    resource: string;
    target: string;
    amountRef: string;
    index: number;
    triggers: AbilityTriggerKind[];
}): BehaviorRule => ({
    id: `sys_produce_${input.resource}_${input.index}`,
    sortKey: "sys_050",
    conditions: buildAbilityTriggerConditions(input.triggers),
    actions: buildProductionActions(input),
});
