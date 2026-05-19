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

const makeBodyEntity = (id: string, health: number): RuntimeEntity => ({
    id,
    body: {
        xp: 0,
        xpRate: 1,
        level: 1,
        health,
        maxHealth: 100,
        baseAttributes: { body: 1, mind: 1, social: 1 },
        attributes: { body: 1, mind: 1, social: 1 },
        traits: [],
        passport: {},
    },
});

describe("BodySystem – death", () => {
    it("emits KILL command when body health is zero", () => {
        // Given
        const system = new BodySystem({}, 100);
        const buffer = makeBuffer();
        const entity = makeBodyEntity("dead-body", 0);

        // When
        system.tick(makeSnapshot([entity]), buffer, 1000);

        // Then
        const kills = buffer.commands.filter(
            (c) => c.type === RuntimeCommandType.KILL,
        );
        expect(kills).toHaveLength(1);
        expect((kills[0] as any).payload.entityId).toBe("dead-body");
    });

    it("emits KILL command when body health is negative", () => {
        // Given
        const system = new BodySystem({}, 100);
        const buffer = makeBuffer();
        const entity = makeBodyEntity("wounded", -5);

        // When
        system.tick(makeSnapshot([entity]), buffer, 1000);

        // Then
        const kills = buffer.commands.filter(
            (c) => c.type === RuntimeCommandType.KILL,
        );
        expect(kills).toHaveLength(1);
        expect((kills[0] as any).payload.entityId).toBe("wounded");
    });

    it("does not update a dead body", () => {
        // Given
        const system = new BodySystem({}, 100);
        const buffer = makeBuffer();
        const entity = makeBodyEntity("dead-body", 0);

        // When
        system.tick(makeSnapshot([entity]), buffer, 1000);

        // Then
        const updates = buffer.commands.filter(
            (c) => c.type === RuntimeCommandType.UPDATE_BODIES_BATCH,
        );
        expect(updates).toHaveLength(0);
    });

    it("processes alive bodies normally alongside dead ones", () => {
        // Given
        const system = new BodySystem({}, 100);
        const buffer = makeBuffer();
        const alive = makeBodyEntity("alive", 100);
        const dead = makeBodyEntity("dead", 0);

        // When
        system.tick(makeSnapshot([alive, dead]), buffer, 1000);

        // Then
        const kills = buffer.commands.filter(
            (c) => c.type === RuntimeCommandType.KILL,
        );
        const updates = buffer.commands.filter(
            (c) => c.type === RuntimeCommandType.UPDATE_BODIES_BATCH,
        );
        expect(kills).toHaveLength(1);
        expect((kills[0] as any).payload.entityId).toBe("dead");
        expect(updates).toHaveLength(1);
    });
});
