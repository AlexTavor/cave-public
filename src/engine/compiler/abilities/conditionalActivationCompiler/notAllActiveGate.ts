import { createConditionalActivationAllActiveGate } from "./allActiveGate";

export const createConditionalActivationNotAllActiveGate = (
    indexes: number[],
) => {
    const gate = createConditionalActivationAllActiveGate(indexes);
    return gate
        ? {
              id: `conditional_activation_not_all_${indexes.join("_")}`,
              sortKey: `conditional_activation_not_all_${indexes.join("_")}`,
              tokens: [],
              compiled: { "!": [gate.compiled] },
          }
        : null;
};
