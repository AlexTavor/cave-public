import { describe, expect, it } from "vitest";
import { CensusSystem } from "./CensusSystem";
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

const makeWorld = (population: number, extras?: Record<string, unknown>) =>
    ({
        id: "sys_world",
        state: { population: { value: population, visible: true } },
        ...extras,
    }) as RuntimeEntity;

const makeWorker = (id: string): RuntimeEntity => ({
    id,
    body: { level: 1, xp: 0, attributes: { body: 1, mind: 1, social: 1 } },
});

describe("CensusSystem", () => {
    it("enqueues GAME_DORMANCY when population drops to zero", () => {
        const system = new CensusSystem();
        const buffer = makeBuffer();
        const entities = [makeWorld(2)];

        system.tick(makeSnapshot(entities), buffer, 1);

        const dormancy = buffer.commands.find(
            (c) => c.type === RuntimeCommandType.GAME_DORMANCY,
        );
        expect(dormancy).toBeDefined();
    });

    it("does not trigger dormancy when population was never above zero", () => {
        const system = new CensusSystem();
        const buffer = makeBuffer();
        const entities = [makeWorld(0)];

        system.tick(makeSnapshot(entities), buffer, 1);

        const dormancy = buffer.commands.find(
            (c) => c.type === RuntimeCommandType.GAME_DORMANCY,
        );
        expect(dormancy).toBeUndefined();
    });

    it("does not trigger dormancy when workers still alive", () => {
        const system = new CensusSystem();
        const buffer = makeBuffer();
        const entities = [makeWorld(1), makeWorker("w1")];

        system.tick(makeSnapshot(entities), buffer, 1);

        const dormancy = buffer.commands.find(
            (c) => c.type === RuntimeCommandType.GAME_DORMANCY,
        );
        expect(dormancy).toBeUndefined();
    });

    it("does not trigger dormancy if already dormant", () => {
        const system = new CensusSystem();
        const buffer = makeBuffer();
        const entities = [
            makeWorld(2, {
                state: {
                    population: { value: 2 },
                    dormant: { value: 1, visible: false },
                },
            }),
        ];

        system.tick(makeSnapshot(entities), buffer, 1);

        const dormancy = buffer.commands.find(
            (c) => c.type === RuntimeCommandType.GAME_DORMANCY,
        );
        expect(dormancy).toBeUndefined();
    });
});
