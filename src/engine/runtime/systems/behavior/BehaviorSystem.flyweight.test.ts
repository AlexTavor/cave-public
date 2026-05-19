import { describe, expect, it } from "vitest";
import { World } from "miniplex";
import { Snapshot } from "../../Snapshot";
import {
    RuntimeCommandType,
    type RuntimeCommand,
    type RuntimeEntity,
} from "../../types";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../../../data/schemas/physics";
import { BehaviorSystem } from "../BehaviorSystem";
import { createBlueprint } from "../../../test/factories";

const makeBuffer = () => {
    const commands: RuntimeCommand[] = [];
    return {
        commands,
        buffer: {
            enqueue: (command: RuntimeCommand) => commands.push(command),
            drain: () => [...commands],
            clear: () => {
                commands.length = 0;
            },
            size: () => commands.length,
        },
    };
};

const makeSnapshot = (
    entities: RuntimeEntity[],
    behaviorValue = 1,
): Snapshot => {
    const world = new World<RuntimeEntity>();
    entities.forEach((entity) => world.add(entity));
    const blueprints = {
        thinker: createBlueprint("thinker", {
            components: {
                behavior: {
                    rules: [
                        {
                            id: "r1",
                            sortKey: "r1",
                            conditions: [],
                            actions: [
                                {
                                    type: "MUTATE",
                                    target: "self.state.energy",
                                    op: "ADD",
                                    value: behaviorValue,
                                },
                            ],
                        },
                    ],
                } as any,
            },
        }),
    };
    return new Snapshot(
        [...world.entities],
        new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
        blueprints,
    );
};

describe("BehaviorSystem flyweight", () => {
    it("executes behavior from blueprint when instance has no behavior", () => {
        const system = new BehaviorSystem();
        const { commands, buffer } = makeBuffer();
        const snapshot = makeSnapshot([
            { id: "sys_world", state: {} },
            {
                id: "e1",
                blueprintId: "thinker",
                state: { energy: { value: 0 } },
            },
        ]);

        system.tick(snapshot, buffer, 16);

        expect(commands[0]).toMatchObject({
            type: RuntimeCommandType.ADJUST_STATE,
            payload: { entityId: "e1", key: "energy", delta: 1 },
            metadata: { sourceEntityId: "e1", sourceLane: "behavior_rule" },
        });
    });

    it("uses latest blueprint behavior on next tick", () => {
        const system = new BehaviorSystem();
        const { commands, buffer } = makeBuffer();
        const entities: RuntimeEntity[] = [
            { id: "sys_world", state: {} },
            {
                id: "e1",
                blueprintId: "thinker",
                state: { energy: { value: 0 } },
            },
        ];

        system.tick(makeSnapshot(entities, 1), buffer, 16);
        system.tick(makeSnapshot(entities, 4), buffer, 16);

        expect((commands[0] as any).payload.delta).toBe(1);
        expect((commands[1] as any).payload.delta).toBe(4);
    });
});

