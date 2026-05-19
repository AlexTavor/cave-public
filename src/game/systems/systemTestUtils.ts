import { Snapshot } from "../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../engine/runtime/types";

type Attributes = { body?: number; mind?: number; social?: number };

export const makeBuffer = (): CommandBuffer<RuntimeCommand> & {
    commands: RuntimeCommand[];
} => {
    const commands: RuntimeCommand[] = [];
    return {
        enqueue: (command) => commands.push(command),
        drain: () => {
            const copy = [...commands];
            commands.length = 0;
            return copy;
        },
        clear: () => {
            commands.length = 0;
        },
        size: () => commands.length,
        commands,
    } as CommandBuffer<RuntimeCommand> & { commands: RuntimeCommand[] };
};

export const makeSnapshot = (entities: RuntimeEntity[]): Snapshot =>
    new Snapshot(entities, { getBody: () => undefined } as any);

const buildBody = (attributes: Attributes) => ({
    attributes: { body: 0, mind: 0, social: 0, ...attributes },
    baseAttributes: { body: 0, mind: 0, social: 0, ...attributes },
    traits: [],
    xp: 0,
    xpRate: 1,
    level: 1,
    passport: {},
    health: 100,
    maxHealth: 100,
});

export const makeBody = (id: string, attributes: Attributes) => ({
    id,
    body: buildBody(attributes),
});
