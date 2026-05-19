import { buildAutoReqTransferRule } from "../../../engine/compiler/abilities/autoRequestRuleBuilder";
import { buildWorldAutoRequestMaxRules } from "./worldAutoRequestMaxRules";

export interface WorldAutoRequestDefaults {
    baseDemandPerSecond: number;
    bodyDemandPerBodyPerSecond: number;
    windowSeconds: number;
    minCapacity: number;
}

export const buildWorldAutoRequestState = (
    resource: string,
    index: number,
    defaults: WorldAutoRequestDefaults,
): Record<string, { value: number; visible: boolean }> => ({
    [`auto_req_${resource}_timer_${index}`]: { value: 0, visible: false },
    [`auto_req_${resource}_need_${index}`]: { value: 0, visible: false },
    [`auto_req_${resource}_base_demand_per_s_${index}`]: {
        value: defaults.baseDemandPerSecond,
        visible: false,
    },
    [`auto_req_${resource}_body_demand_per_body_per_s_${index}`]: {
        value: defaults.bodyDemandPerBodyPerSecond,
        visible: false,
    },
    [`auto_req_${resource}_window_s_${index}`]: {
        value: defaults.windowSeconds,
        visible: false,
    },
    [`auto_req_${resource}_min_capacity_${index}`]: {
        value: defaults.minCapacity,
        visible: false,
    },
    [`auto_req_${resource}_target_${index}`]: { value: 0, visible: false },
});

export const buildWorldAutoRequestEffect = (
    resource: string,
    index: number,
) => ({
    op: "ADD",
    target: `self.state.auto_req_${resource}_timer_${index}.value`,
    source: "global.dt_s",
});

export const buildWorldAutoRequestRules = (resource: string, index: number) => {
    const timerKey = `auto_req_${resource}_timer_${index}`;
    const needKey = `auto_req_${resource}_need_${index}`;
    const baseKey = `auto_req_${resource}_base_demand_per_s_${index}`;
    const bodyKey = `auto_req_${resource}_body_demand_per_body_per_s_${index}`;
    const windowKey = `auto_req_${resource}_window_s_${index}`;
    const targetKey = `auto_req_${resource}_target_${index}`;
    const needRef = `self.state.${needKey}.value`;
    const timerCond = {
        id: "timer_ready",
        sortKey: "0",
        tokens: [
            { t: "ref" as const, v: `self.state.${timerKey}.value` },
            { t: "op" as const, v: ">=" },
            { t: "val" as const, v: 1 },
        ],
    };

    return [
        {
            id: `sys_auto_req_${resource}_need_${index}`,
            sortKey: "sys_world_030",
            conditions: [timerCond],
            actions: [
                {
                    type: "MUTATE",
                    target: `self.state.${targetKey}.value`,
                    op: "SET",
                    value: `(self.state.${baseKey}.value + (self.state.${bodyKey}.value * global.population)) * self.state.${windowKey}.value`,
                },
                {
                    type: "MUTATE",
                    target: needRef,
                    op: "SET",
                    value: `self.state.${targetKey}.value - self.state.${resource}.value`,
                },
            ],
        },
        ...buildWorldAutoRequestMaxRules(resource, index, timerCond),
        buildAutoReqTransferRule({
            id: `sys_auto_req_${resource}_xfer_${index}`,
            sortKey: "sys_world_033",
            timerCondition: timerCond,
            needRef,
            needOp: ">=",
            needThreshold: 1,
            minReq: 1,
            source: `tag:storage:${resource}`,
            resource,
            amount: needRef,
            timerKey,
        }),
    ];
};

