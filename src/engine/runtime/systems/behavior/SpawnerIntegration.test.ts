import { describe, it, expect } from "vitest";
import { World } from "miniplex";
import { Snapshot } from "../../Snapshot";
import { BehaviorSystem } from "../BehaviorSystem";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../../../data/schemas/physics";
import { CompilerService } from "../../../compiler/CompilerService";
import { createBlueprint } from "../../../test/factories";
import type { RuntimeCommand, RuntimeEntity } from "../../types";
import { RuntimeCommandType } from "../../types";

const buildSnapshot = (entities: RuntimeEntity[]) => {
    const world = new World<RuntimeEntity>();
    entities.forEach((entity) => world.add(entity));
    return new Snapshot(
        [...world.entities],
        new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
    );
};

const createCommandBuffer = () => {
    const buffer: RuntimeCommand[] = [];
    return {
        buffer,
        commandBuffer: {
            enqueue: (command: RuntimeCommand) => buffer.push(command),
            drain: () => buffer.splice(0, buffer.length),
            clear: () => buffer.splice(0, buffer.length),
            size: () => buffer.length,
        },
    };
};

describe("Spawner integration", () => {
    it("emits SPAWN_BODY commands on cycle completion", () => {
        const blueprint = createBlueprint("bp_spawner", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {},
                        oneOff: false,
                        conditions: [],
                    },
                    spawner: [
                        {
                            blueprintId: "bp_child",
                            count: { base: 1, perBody: 0, multPerBody: 0 },
                            mode: "spawn_body",
                            target: "self",
                            conditions: [],
                        },
                    ],
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const state = { ...compiled.components.state } as any;
        state.cycle.value = state.cycle.max;

        const spawner: RuntimeEntity = {
            id: "spawner",
            state,
            behavior: compiled.components.behavior,
        } as RuntimeEntity;
        const world: RuntimeEntity = { id: "sys_world", state: {} } as any;

        const system = new BehaviorSystem();
        const { buffer, commandBuffer } = createCommandBuffer();
        system.tick(buildSnapshot([world, spawner]), commandBuffer, 16);

        const spawn = buffer.find(
            (command) => command.type === RuntimeCommandType.SPAWN,
        );
        expect(spawn).toBeDefined();
        // The entity id is no longer minted in the behavior phase (read-only
        // snapshot). The body→owner assignment rides on the SPAWN payload via
        // `assignTo`; SpawnHandler mints the id and issues the ASSIGN_BODIES_BATCH
        // in the command phase. So the behavior phase emits exactly one SPAWN with
        // no pre-assigned id and the target carried as assignTo.
        const payload = spawn?.payload as { id?: string; assignTo?: string };
        expect(payload.id).toBeUndefined();
        expect(payload.assignTo).toBe("self");
        expect(
            buffer.every(
                (command) =>
                    command.type !== RuntimeCommandType.ASSIGN_BODIES_BATCH,
            ),
        ).toBe(true);
    });
});

