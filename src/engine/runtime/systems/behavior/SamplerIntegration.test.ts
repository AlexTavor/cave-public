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

describe("Sampler integration", () => {
    it("emits state sync commands on cycle completion", () => {
        const blueprint = createBlueprint("bp_sampler", {
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
                    sampler: [
                        {
                            source: "sys_world.state.notoriety.value",
                            visible: true,
                            target: "sampled_value",
                            max: 100,
                        },
                    ],
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const state = { ...compiled.components.state } as any;
        state.cycle.value = state.cycle.max;

        const sampler: RuntimeEntity = {
            id: "sampler",
            state,
            behavior: compiled.components.behavior,
        } as RuntimeEntity;
        const world: RuntimeEntity = {
            id: "sys_world",
            state: { notoriety: { value: 50, max: 100 } },
        } as RuntimeEntity;

        const system = new BehaviorSystem();
        const { buffer, commandBuffer } = createCommandBuffer();
        system.tick(buildSnapshot([world, sampler]), commandBuffer, 16);

        const samplerUpdates = buffer.filter(
            (command) =>
                command.type === RuntimeCommandType.UPDATE_STATE &&
                command.payload.key === "sampled_notoriety",
        );

        expect(samplerUpdates).toHaveLength(1);
        expect(samplerUpdates[0]).toMatchObject({
            payload: { entityId: "sampler", key: "sampled_notoriety" },
        });
    });
});

