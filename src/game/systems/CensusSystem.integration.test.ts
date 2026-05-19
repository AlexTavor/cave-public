import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { CensusSystem } from "./CensusSystem";

const makeBuffer = (): CommandBuffer<RuntimeCommand> & {
    commands: RuntimeCommand[];
} => {
    const commands: RuntimeCommand[] = [];
    return {
        enqueue: (command) => commands.push(command),
        drain: () => commands.splice(0, commands.length),
        clear: () => commands.splice(0, commands.length),
        size: () => commands.length,
        commands,
    } as CommandBuffer<RuntimeCommand> & { commands: RuntimeCommand[] };
};

const makeSnapshot = (entities: RuntimeEntity[]): Snapshot =>
    new Snapshot(entities, { getBody: () => undefined } as any);

describe("CensusSystem", () => {
    it("updates global population and marks it visible", () => {
        const system = new CensusSystem();
        const buffer = makeBuffer();

        const entities: RuntimeEntity[] = [
            { id: "sys_world", tags: ["sys_world"], state: {} },
            ...Array.from({ length: 5 }, (_, idx) => ({
                id: `worker_${idx}`,
                body: { traits: [] },
                tags: ["worker"],
            })),
            {
                id: "aggregate",
                body: { traits: [] },
                tags: ["aggregate"],
            },
            { id: "no_body", tags: [] },
        ];

        system.tick(makeSnapshot(entities), buffer, 16);

        expect(buffer.commands).toEqual([
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "sys_world",
                    key: "population",
                    value: 5,
                    visible: true,
                },
            },
        ]);
    });
});
