const normalize = (resource: string) => resource.trim();

export const cycleCostBaseAmountKey = (resource: string, index: number) =>
    `vals_cycle_cost_base_${normalize(resource)}_${index}`;

export const cycleCostFinalAmountKey = (resource: string, index: number) =>
    `vals_cycle_cost_${normalize(resource)}_${index}`;

export const cycleCostTotalAmountKey = (resource: string) =>
    `vals_cycle_cost_total_${normalize(resource)}`;

export const cycleCostRequestTimerKey = (resource: string) =>
    `cycle_cost_req_${normalize(resource)}_timer`;

export const cycleCostRequestNeedKey = (resource: string) =>
    `cycle_cost_req_${normalize(resource)}_need`;

export const cycleCostRequestLimitKey = (resource: string) =>
    `cycle_cost_req_${normalize(resource)}_limit`;
