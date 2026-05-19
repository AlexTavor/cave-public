const buildClampRule = (
    resource: string,
    lowSortKey: string,
    tutorialSortKey: string,
    highSortKey: string,
) => [
    {
        id: `sys_world_clamp_${resource}_low`,
        sortKey: lowSortKey,
        conditions: [
            {
                id: `${resource}_below_zero`,
                sortKey: "0",
                tokens: [
                    { t: "ref", v: `self.state.${resource}.value` },
                    { t: "op", v: "<" },
                    { t: "val", v: 0 },
                ],
            },
        ],
        actions: [
            {
                type: "MUTATE",
                target: `self.state.${resource}.value`,
                op: "SET",
                value: 0,
            },
        ],
    },
    {
        id: `sys_world_clamp_${resource}_tutorial_floor`,
        sortKey: tutorialSortKey,
        conditions: [
            {
                id: `${resource}_tutorial_floor`,
                sortKey: "0",
                tokens: [],
                compiled: {
                    and: [
                        {
                            ">=": [
                                { var: "self.state.tutorial_mode.value" },
                                1,
                            ],
                        },
                        {
                            "<": [
                                { var: `self.state.${resource}.value` },
                                {
                                    "*": [
                                        { var: `self.state.${resource}.max` },
                                        0.5,
                                    ],
                                },
                            ],
                        },
                    ],
                },
            },
        ],
        actions: [
            {
                type: "MUTATE",
                target: `self.state.${resource}.value`,
                op: "SET",
                value: `self.state.${resource}.max * 0.5`,
            },
        ],
    },
    {
        id: `sys_world_clamp_${resource}_high`,
        sortKey: highSortKey,
        conditions: [
            {
                id: `${resource}_above_max`,
                sortKey: "0",
                tokens: [
                    { t: "ref", v: `self.state.${resource}.value` },
                    { t: "op", v: ">" },
                    { t: "ref", v: `self.state.${resource}.max` },
                ],
            },
            {
                id: `${resource}_preserve_not_enabled`,
                sortKey: "1",
                tokens: [
                    {
                        t: "ref",
                        v: `self.state.${resource}.preserveValueOnMaxDecrease`,
                    },
                    { t: "op", v: "!=" },
                    { t: "val", v: 1 },
                ],
            },
        ],
        actions: [
            {
                type: "MUTATE",
                target: `self.state.${resource}.value`,
                op: "SET",
                value: `self.state.${resource}.max`,
            },
        ],
    },
];

export const WORLD_CLAMP_RULES = [
    ...buildClampRule(
        "food",
        "sys_world_010",
        "sys_world_011",
        "sys_world_012",
    ),
    ...buildClampRule(
        "heat",
        "sys_world_013",
        "sys_world_014",
        "sys_world_015",
    ),
];

