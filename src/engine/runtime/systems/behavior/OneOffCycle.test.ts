import { describe, expect, it } from "vitest";
import { Snapshot } from "../../Snapshot";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../../../data/schemas/physics";
import type { RuntimeCommand, RuntimeEntity } from "../../types";
import { RuntimeCommandType } from "../../types";
import { BehaviorSystem } from "../BehaviorSystem";
import { CompilerService } from "../../../compiler/CompilerService";
import { createBlueprint } from "../../../test/factories";

const buildSnapshot = (entities: RuntimeEntity[]) =>
    new Snapshot(entities, new ImpulseEngine(DEFAULT_IMPULSE_CONFIG));

const createBuffer = () => {
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

const compileLootComponents = () =>
    new CompilerService().compile(
        createBlueprint("loot_chest", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 5, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {},
                        oneOff: true,
                        conditions: [],
                    },
                    storage: [
                        {
                            resource: "wood",
                            capacity: { base: 0, perBody: 0, multPerBody: 0 },
                            isDefault: true,
                            entropy: { base: 0, perBody: 0, multPerBody: 0 },
                            visible: true,
                            allowDeposit: true,
                            allowWithdraw: true,
                            priority: 0,
                        },
                    ],
                },
            },
        }),
    ).components;

describe("One-off cycle lifecycle", () => {
    it("does not kill while storage is non-empty", () => {
        const components = compileLootComponents();
        const loot: RuntimeEntity = {
            id: "loot",
            state: {
                ...components.state,
                is_depleted: { value: 1, visible: false },
                wood: { value: 10, max: 10, visible: false },
            },
            behavior: components.behavior,
        };
        const world: RuntimeEntity = { id: "sys_world", state: {} };
        const system = new BehaviorSystem();
        const { buffer, commandBuffer } = createBuffer();

        system.tick(buildSnapshot([world, loot]), commandBuffer, 16);

        expect(buffer).toEqual([]);
    });

    it("kills once storage is empty", () => {
        const components = compileLootComponents();
        const loot: RuntimeEntity = {
            id: "loot",
            state: {
                ...components.state,
                is_depleted: { value: 1, visible: false },
                wood: { value: 0, max: 10, visible: false },
            },
            behavior: components.behavior,
        };
        const world: RuntimeEntity = { id: "sys_world", state: {} };
        const system = new BehaviorSystem();
        const { buffer, commandBuffer } = createBuffer();

        system.tick(buildSnapshot([world, loot]), commandBuffer, 16);

        expect(buffer).toEqual([
            expect.objectContaining({
                type: RuntimeCommandType.KILL,
                payload: { entityId: "loot" },
                metadata: {
                    sourceEntityId: "loot",
                    sourceLane: "behavior_rule",
                },
            }),
        ]);
    });
});

