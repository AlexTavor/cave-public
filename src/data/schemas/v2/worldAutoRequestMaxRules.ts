import type { BehaviorRule } from "../behavior";

export const buildWorldAutoRequestMaxRules = (
    resource: string,
    index: number,
    timerCondition: BehaviorRule["conditions"][number],
): BehaviorRule[] => {
    const maxRef = `self.state.${resource}.max`;
    const minRef = `self.state.auto_req_${resource}_min_capacity_${index}.value`;
    const targetRef = `self.state.auto_req_${resource}_target_${index}.value`;
    return [
        {
            id: `sys_auto_req_${resource}_set_floor_max_${index}`,
            sortKey: "sys_world_031",
            conditions: [
                timerCondition,
                {
                    id: "target_below_floor",
                    sortKey: "1",
                    tokens: [
                        { t: "ref", v: targetRef },
                        { t: "op", v: "<" },
                        { t: "ref", v: minRef },
                    ],
                },
                {
                    id: "max_not_floor",
                    sortKey: "2",
                    tokens: [
                        { t: "ref", v: maxRef },
                        { t: "op", v: "!=" },
                        { t: "ref", v: minRef },
                    ],
                },
            ],
            actions: [
                { type: "MUTATE", target: maxRef, op: "SET", value: minRef },
            ],
        },
        {
            id: `sys_auto_req_${resource}_set_target_max_${index}`,
            sortKey: "sys_world_032",
            conditions: [
                timerCondition,
                {
                    id: "target_at_or_above_floor",
                    sortKey: "1",
                    tokens: [
                        { t: "ref", v: targetRef },
                        { t: "op", v: ">=" },
                        { t: "ref", v: minRef },
                    ],
                },
                {
                    id: "max_not_target",
                    sortKey: "2",
                    tokens: [
                        { t: "ref", v: maxRef },
                        { t: "op", v: "!=" },
                        { t: "ref", v: targetRef },
                    ],
                },
            ],
            actions: [
                { type: "MUTATE", target: maxRef, op: "SET", value: targetRef },
            ],
        },
    ];
};
