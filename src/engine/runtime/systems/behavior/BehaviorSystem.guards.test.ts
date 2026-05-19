import { describe, expect, it } from "vitest";
import { World } from "miniplex";
import { Snapshot } from "../../Snapshot";
import type { RuntimeCommand, RuntimeEntity } from "../../types";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../../../data/schemas/physics";
import { BehaviorSystem } from "../BehaviorSystem";

const makeSnapshot = (entities: RuntimeEntity[]) => {
    const world = new World<RuntimeEntity>();
    entities.forEach((entity) => world.add(entity));
    return new Snapshot([...world.entities], new ImpulseEngine(DEFAULT_IMPULSE_CONFIG));
};
const makeBuffer = () => {
    const list: RuntimeCommand[] = [];
    return { list, commandBuffer: { enqueue: (command: RuntimeCommand) => list.push(command), drain: () => [], clear: () => { list.length = 0; }, size: () => list.length } as any };
};

describe("BehaviorSystem guards", () => {
    it("applies continuous mutate actions every tick", () => {
        const entity = { id: "entity_a", state: { energy: { value: 0 } }, behavior: { rules: [{ id: "r", sortKey: "1", conditions: [], actions: [{ type: "MUTATE", target: "self.state.energy", op: "ADD", value: 1 }] }] } } as RuntimeEntity;
        const { list, commandBuffer } = makeBuffer();
        const system = new BehaviorSystem();
        system.tick(makeSnapshot([{ id: "sys_world", state: {} } as RuntimeEntity, entity]), commandBuffer, 16);
        (entity as any).state.energy.value = 1;
        system.tick(makeSnapshot([{ id: "sys_world", state: {} } as RuntimeEntity, entity]), commandBuffer, 16);
        expect(list).toHaveLength(2);
        expect(list[1]).toMatchObject({ payload: { delta: 1 }, metadata: { sourceLane: "behavior_rule" } });
    });

    it("ignores invalid references by resolving to no command", () => {
        const entity = { id: "entity_a", state: { energy: { value: 10 } }, behavior: { rules: [{ id: "r", sortKey: "1", conditions: [], actions: [{ type: "MUTATE", target: "self.state.energy", op: "ADD", value: "self.missing_prop" }] }] } } as RuntimeEntity;
        const { list, commandBuffer } = makeBuffer();
        new BehaviorSystem().tick(makeSnapshot([{ id: "sys_world", state: {} } as RuntimeEntity, entity]), commandBuffer, 16);
        expect(list).toEqual([]);
    });

    it("drops self-transfers silently", () => {
        const entity = { id: "entity_a", state: { gold: { value: 5 } }, behavior: { rules: [{ id: "r", sortKey: "1", conditions: [], actions: [{ type: "TRANSFER", source: "self", target: "self", resource: "gold", amount: 1 }] }] } } as RuntimeEntity;
        const { list, commandBuffer } = makeBuffer();
        new BehaviorSystem().tick(makeSnapshot([{ id: "sys_world", state: {} } as RuntimeEntity, entity]), commandBuffer, 16);
        expect(list).toEqual([]);
    });
});