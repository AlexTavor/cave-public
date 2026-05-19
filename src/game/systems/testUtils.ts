import type { RuntimeCommand, RuntimeEntity } from "../../engine/runtime/types";

export const createCommandBuffer = () => {
    const buffer: RuntimeCommand[] = [];
    return {
        buffer,
        commands: {
            enqueue: (command: RuntimeCommand) => buffer.push(command),
            drain: () => buffer.splice(0, buffer.length),
            clear: () => buffer.splice(0, buffer.length),
            size: () => buffer.length,
        },
    };
};

export const createMetabolicEntities = (): {
    sysWorld: RuntimeEntity;
    worker: RuntimeEntity;
} => ({
    sysWorld: {
        id: "sys_world",
        tags: ["sys_world"],
        state: {
            population: { value: 1 },
            food: { value: 9 },
            heat: { value: 9 },
            comfort: { value: 1, max: 1 },
        },
        behavior: {
            rules: [
                {
                    id: "consume",
                    sortKey: "1",
                    conditions: [
                        {
                            id: "cond1",
                            sortKey: "1",
                            tokens: [
                                { t: "ref", v: "global.population" },
                                { t: "op", v: ">" },
                                { t: "val", v: 0 },
                            ],
                        },
                    ],
                    actions: [
                        {
                            type: "MUTATE",
                            target: "global.food",
                            op: "SUB",
                            value: "global.population * global.dt",
                        },
                    ],
                },
            ],
        },
    },
    worker: {
        id: "worker",
        traits: [],
        behavior: {
            rules: [
                {
                    id: "hungry",
                    sortKey: "2",
                    conditions: [
                        {
                            id: "cond2",
                            sortKey: "2",
                            tokens: [
                                { t: "ref", v: "global.food" },
                                { t: "op", v: "<" },
                                { t: "val", v: 10 },
                            ],
                        },
                    ],
                    actions: [{ type: "ADD_TRAIT", traitId: "malnourished" }],
                },
            ],
        },
        body: {
            xp: 0,
            xpRate: 0,
            level: 1,
            baseAttributes: { body: 10, mind: 1, social: 1 },
            attributes: { body: 10, mind: 1, social: 1 },
            traits: [],
            passport: {},
        },
    },
});

export const createMalnourishedTraitIndex = () => ({
    malnourished: {
        id: "malnourished",
        label: "Malnourished",
        modifiers: {
            bodyMultiplier: 0.5,
            mindMultiplier: 1,
            socialMultiplier: 1,
        },
    },
});

