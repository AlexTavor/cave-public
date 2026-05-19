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

describe("BodySystem", () => {
    it("batches xp updates for multiple entities", () => {
        const system = new BodySystem({}, 100);
        const buffer = makeBuffer();

        const entities: RuntimeEntity[] = [
            {
                id: "a",
                body: {
                    xp: 0,
                    xpRate: 1,
                    level: 1,
                    baseAttributes: { body: 1, mind: 1, social: 1 },
                    attributes: { body: 1, mind: 1, social: 1 },
                    traits: [],
                    passport: {},
                },
            },
            {
                id: "b",
                body: {
                    xp: 0,
                    xpRate: 1,
                    level: 1,
                    baseAttributes: { body: 1, mind: 1, social: 1 },
                    attributes: { body: 1, mind: 1, social: 1 },
                    traits: [],
                    passport: {},
                },
            },
        ];

        system.tick(makeSnapshot(entities), buffer, 50000);

        const updates = buffer.commands.filter(
            (c: RuntimeCommand) =>
                c.type === RuntimeCommandType.UPDATE_BODIES_BATCH,
        );
        expect(updates).toHaveLength(1);
        const payload = (updates[0] as any).payload.updates;
        expect(payload).toHaveLength(2);
        expect(payload[0].xp).toBe(50);
        expect(payload[1].xp).toBe(50);
    });

    it("levels up and increases base attributes", () => {
        const system = new BodySystem({}, 100);
        const buffer = makeBuffer();

        const entity: RuntimeEntity = {
            id: "c",
            blueprintId: "hero",
            body: {
                xp: 90,
                xpRate: 1,
                level: 1,
                baseAttributes: { body: 1, mind: 1, social: 1 },
                attributes: { body: 1, mind: 1, social: 1 },
                traits: [],
                passport: {},
            },
        };

        system.tick(makeSnapshot([entity]), buffer, 20000);

        const batch = buffer.commands.find(
            (c: RuntimeCommand) =>
                c.type === RuntimeCommandType.UPDATE_BODIES_BATCH,
        ) as any;

        expect(batch).toBeDefined();
        expect(batch.payload.updates[0].level).toBe(2);
        expect(batch.payload.updates[0].xp).toBe(10);
    });
});

