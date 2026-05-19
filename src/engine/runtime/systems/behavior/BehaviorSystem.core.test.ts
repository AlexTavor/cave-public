import { describe, expect, it } from "vitest";
import { World } from "miniplex";
import { Snapshot } from "../../Snapshot";
import { RuntimeCommandType, type RuntimeCommand, type RuntimeEntity } from "../../types";
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

describe("BehaviorSystem core", () => {
    it("applies mutate actions and resolves globals", () => {
        const entity = { id: "entity_a", state: { energy: { value: 0 } }, behavior: { rules: [{ id: "r", sortKey: "1", conditions: [], actions: [{ type: "MUTATE", target: "self.state.energy", op: "ADD", value: "global.rate" }] }] } } as RuntimeEntity;
        const { list, commandBuffer } = makeBuffer();
        new BehaviorSystem().tick(makeSnapshot([{ id: "sys_world", state: { rate: { value: 5 } } } as RuntimeEntity, entity]), commandBuffer, 16);
        expect(list[0]).toMatchObject({ type: RuntimeCommandType.ADJUST_STATE, payload: { entityId: "entity_a", key: "energy", delta: 5 }, metadata: { sourceEntityId: "entity_a", sourceLane: "behavior_rule" } });
    });

    it("emits spawn and kill actions for matching rules", () => {
        const entity = { id: "entity_a", state: { hp: { value: 5 } }, behavior: { rules: [{ id: "r", sortKey: "1", conditions: [{ id: "c", sortKey: "1", tokens: [{ t: "ref", v: "self.state.hp.value" }, { t: "op", v: "<" }, { t: "val", v: 10 }] }], actions: [{ type: "SPAWN", blueprintId: "ghost" }, { type: "KILL", entityId: "self" }] }] } } as RuntimeEntity;
        const { list, commandBuffer } = makeBuffer();
        new BehaviorSystem().tick(makeSnapshot([{ id: "sys_world", state: {} } as RuntimeEntity, entity]), commandBuffer, 16);
        expect(list).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: RuntimeCommandType.SPAWN, payload: { blueprintId: "ghost" }, metadata: { sourceEntityId: "entity_a", sourceLane: "behavior_rule" } }),
            expect.objectContaining({ type: RuntimeCommandType.KILL, payload: { entityId: "entity_a" }, metadata: { sourceEntityId: "entity_a", sourceLane: "behavior_rule" } }),
        ]));
    });

    it("injects dt into globals", () => {
        const entity = { id: "entity_a", state: { energy: { value: 0 } }, behavior: { rules: [{ id: "r", sortKey: "1", conditions: [], actions: [{ type: "MUTATE", target: "self.state.energy", op: "ADD", value: "global.dt" }] }] } } as RuntimeEntity;
        const { list, commandBuffer } = makeBuffer();
        new BehaviorSystem().tick(makeSnapshot([{ id: "sys_world", state: {} } as RuntimeEntity, entity]), commandBuffer, 20);
        expect(list[0]).toMatchObject({ payload: { delta: 20 }, metadata: { sourceLane: "behavior_rule" } });
    });
});