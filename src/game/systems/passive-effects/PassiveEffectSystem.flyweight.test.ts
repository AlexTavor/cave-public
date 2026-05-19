import { describe, expect, it } from "vitest";
import { Snapshot } from "../../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { PassiveEffectsSystem } from "./PassiveEffectSystem";
import { GlobalEffectsIndexer } from "../../../engine/runtime/systems/GlobalEffectsIndexer";
import { createBlueprint } from "../../../engine/test/factories";
import { Op } from "../../../data/schemas/primitives";

const makeBuffer = () => {
    const commands: unknown[] = [];
    return {
        commands,
        buffer: {
            enqueue: (command: unknown) => commands.push(command),
            drain: () => [...commands],
            clear: () => {
                commands.length = 0;
            },
            size: () => commands.length,
        },
    };
};

describe("PassiveEffectsSystem flyweight", () => {
    it("applies passive effects from blueprint when entity has no local passiveEffects", () => {
        const globalIndexer = new GlobalEffectsIndexer();
        const system = new PassiveEffectsSystem(globalIndexer);
        const { commands, buffer } = makeBuffer();
        const entity = {
            id: "e1",
            blueprintId: "worker",
            tags: [],
            state: { energy: { value: 10 } },
        };
        const blueprints = {
            worker: createBlueprint("worker", {
                components: {
                    passiveEffects: [
                        {
                            op: Op.ADD,
                            target: "self.state.energy.value",
                            value: 5,
                        },
                    ],
                },
            }),
        };
        const snapshot = new Snapshot(
            [{ id: "sys_world", state: {} }, entity as any],
            { getBody: () => undefined } as never,
            blueprints,
        );

        globalIndexer.tick(snapshot, buffer as any, 16);
        buffer.clear();
        system.tick(snapshot, buffer as any, 16);

        expect((entity as any).passiveEffects).toBeUndefined();
        expect(commands[0]).toEqual({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: "e1",
                key: "energy",
                value: 15,
                max: undefined,
            },
        });
    });
});
