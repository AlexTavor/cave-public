export const WORLD_COMFORT_RULES = [
    {
        id: "sys_world_compute_comfort",
        sortKey: "sys_world_020",
        conditions: [],
        actions: [
            {
                type: "MUTATE",
                target: "self.state.comfort.value",
                op: "SET",
                value: "((self.state.food.value / self.state.food.max) + (self.state.heat.value / self.state.heat.max)) / 2",
            },
        ],
    },
    {
        id: "sys_world_clamp_comfort_low",
        sortKey: "sys_world_021",
        conditions: [
            {
                id: "comfort_below_zero",
                sortKey: "0",
                tokens: [
                    { t: "ref", v: "self.state.comfort.value" },
                    { t: "op", v: "<" },
                    { t: "val", v: 0 },
                ],
            },
        ],
        actions: [
            {
                type: "MUTATE",
                target: "self.state.comfort.value",
                op: "SET",
                value: 0,
            },
        ],
    },
    {
        id: "sys_world_clamp_comfort_high",
        sortKey: "sys_world_022",
        conditions: [
            {
                id: "comfort_above_one",
                sortKey: "0",
                tokens: [
                    { t: "ref", v: "self.state.comfort.value" },
                    { t: "op", v: ">" },
                    { t: "val", v: 1 },
                ],
            },
        ],
        actions: [
            {
                type: "MUTATE",
                target: "self.state.comfort.value",
                op: "SET",
                value: 1,
            },
        ],
    },
];
