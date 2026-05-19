import { getConditionalActivationActiveStateKey } from "../../../runtime/conditionalActivationState";

const toActiveStateVar = (index: number) =>
    `self.state.${getConditionalActivationActiveStateKey(index)}.value`;

export const createConditionalActivationActiveStateCondition = (
    index: number,
) => ({
    id: `conditional_activation_active_ref_${index}`,
    sortKey: `conditional_activation_active_ref_${index}`,
    tokens: [],
    compiled: { var: toActiveStateVar(index) },
});
