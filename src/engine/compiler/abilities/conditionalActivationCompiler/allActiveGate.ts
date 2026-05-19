import { getConditionalActivationActiveStateKey } from "../../../runtime/conditionalActivationState";

const toActiveStateVar = (index: number) =>
    `self.state.${getConditionalActivationActiveStateKey(index)}.value`;

const toGateCompiled = (indexes: number[]) => {
    const compiled = indexes.map((index) => ({ var: toActiveStateVar(index) }));
    return compiled.length === 1 ? compiled[0] : { and: compiled };
};

export const createConditionalActivationAllActiveGate = (indexes: number[]) =>
    indexes.length === 0
        ? null
        : {
              id: `conditional_activation_all_${indexes.join("_")}`,
              sortKey: `conditional_activation_all_${indexes.join("_")}`,
              tokens: [],
              compiled: toGateCompiled(indexes),
          };
