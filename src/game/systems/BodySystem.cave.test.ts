import { describe, it, expect } from "vitest";
import { BodySystem } from "./BodySystem";
import { Snapshot } from "../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";

const makeBuffer = (): CommandBuffer<RuntimeCommand> & {
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

const makeSnapshot = (entities: RuntimeEntity[]): Snapshot =>
    new Snapshot(entities, { getBody: () => undefined } as any);

describe("BodySystem – cave bonus", () => {
    it("adds cave bonus scaled by comfort", () => {
        const system = new BodySystem({}, 100);
        const buffer = makeBuffer();

        const entities: RuntimeEntity[] = [
            {
                id: "sys_world",
                state: { comfort: { value: 0.5 } },
                cave: {
                    xp: 0,
                    xpRate: 0,
                    level: 1,
                    attributes: { body: 10, mind: 10, social: 10 },
                },
            },
            {
                id: "e",
                body: {
                    xp: 0,
                    xpRate: 0,
                    level: 1,
                    baseAttributes: { body: 5, mind: 5, social: 5 },
                    attributes: { body: 0, mind: 0, social: 0 },
                    traits: [],
                    passport: {},
                },
            },
        ];

        system.tick(makeSnapshot(entities), buffer, 1000);

        const batch = buffer.commands.find(
            (c: RuntimeCommand) =>
                c.type === RuntimeCommandType.UPDATE_BODIES_BATCH,
        ) as any;

        expect(batch.payload.updates[0].attributes).toEqual({
            body: 10,
            mind: 10,
            social: 10,
        });
    });

    it("keeps base attributes when cave comfort is zero", () => {
        const system = new BodySystem({}, 100);
        const buffer = makeBuffer();

        const entities: RuntimeEntity[] = [
            {
                id: "sys_world",
                state: { comfort: { value: 0 } },
                cave: {
                    xp: 0,
                    xpRate: 0,
                    level: 1,
                    attributes: { body: 10, mind: 10, social: 10 },
                },
            },
            {
                id: "e",
                body: {
                    xp: 0,
                    xpRate: 0,
                    level: 1,
                    baseAttributes: { body: 5, mind: 5, social: 5 },
                    attributes: { body: 0, mind: 0, social: 0 },
                    traits: [],
                    passport: {},
                },
            },
        ];

        system.tick(makeSnapshot(entities), buffer, 1000);

        const batch = buffer.commands.find(
            (c: RuntimeCommand) =>
                c.type === RuntimeCommandType.UPDATE_BODIES_BATCH,
        ) as any;

        expect(batch.payload.updates[0].attributes).toEqual({
            body: 5,
            mind: 5,
            social: 5,
        });
    });
});

