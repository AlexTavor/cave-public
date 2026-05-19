import { describe, it, expect } from "vitest";
import { Snapshot } from "../../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { PassiveEffectsSystem } from "./PassiveEffectSystem";

describe("PassiveEffectsSystem", () => {
    const makeSnapshot = (entities: any[]) => {
        const mockPhysics = { getBody: () => undefined } as any;
        return new Snapshot(entities, mockPhysics);
    };

    const makeBuffer = () => {
        const buffer: any[] = [];
        return {
            enqueue: (cmd: any) => buffer.push(cmd),
            drain: () => {
                const res = [...buffer];
                buffer.length = 0;
                return res;
            },
            clear: () => (buffer.length = 0),
            size: () => buffer.length,
            commands: buffer,
        };
    };

    // Helper to create a world entity that Snapshot.getGlobal can read from
    const makeSysWorld = (globals: Record<string, number>) => {
        const state: Record<string, { value: number }> = {};
        for (const [key, value] of Object.entries(globals)) {
            state[key] = { value };
        }
        return {
            id: "sys_world",
            tags: ["sys_world"],
            state,
        };
    };

    it("emits commands for simple SET operations", () => {
        const system = new PassiveEffectsSystem();
        const entity = {
            id: "e1",
            state: { energy: { value: 10 } },
            passiveEffects: [
                { target: "self.state.energy.value", op: "SET", value: 100 },
            ],
        };
        const snapshot = makeSnapshot([entity]);
        const buffer = makeBuffer();

        system.tick(snapshot, buffer, 16);

        expect(buffer.commands).toEqual([
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "energy", value: 100 },
            },
        ]);
    });

    it("chains operations correctly (SET -> MULT -> ADD)", () => {
        const system = new PassiveEffectsSystem();
        const entity = {
            id: "e1",
            state: {
                cost: { value: 0 },
            },
            passiveEffects: [
                { target: "self.state.cost.value", op: "SET", value: 50 },
                { target: "self.state.cost.value", op: "MULT", value: 2 }, // 100
                { target: "self.state.cost.value", op: "ADD", value: 10 }, // 110
            ],
        };
        const snapshot = makeSnapshot([entity]);
        const buffer = makeBuffer();

        system.tick(snapshot, buffer, 16);

        expect(buffer.commands).toEqual([
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "cost", value: 110 },
            },
        ]);
    });

    it("resolves global values like dt", () => {
        const system = new PassiveEffectsSystem();
        const entity = {
            id: "e1",
            state: { timer: { value: 0 } },
            passiveEffects: [
                {
                    target: "self.state.timer.value",
                    op: "ADD",
                    source: "global.dt",
                },
            ],
        };
        const snapshot = makeSnapshot([entity]);
        const buffer = makeBuffer();

        system.tick(snapshot, buffer, 50);

        expect(buffer.commands).toEqual([
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "timer", value: 50 },
            },
        ]);
    });

    it("resolves global population from sys_world", () => {
        const system = new PassiveEffectsSystem();
        const entity = {
            id: "e1",
            state: { cost: { value: 0 } },
            passiveEffects: [
                {
                    target: "self.state.cost.value",
                    op: "SET",
                    source: "global.population",
                },
            ],
        };

        // Provide population via sys_world, simulating CensusSystem output
        const sysWorld = makeSysWorld({ population: 5 });
        const snapshot = makeSnapshot([entity, sysWorld]);
        const buffer = makeBuffer();

        system.tick(snapshot, buffer, 16);

        expect(buffer.commands).toEqual([
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "cost", value: 5 },
            },
        ]);
    });

    it("calculates 'Lure Travelers' formula correctly: 50 + (pop * 30)", () => {
        const system = new PassiveEffectsSystem();
        const station = {
            id: "station_outside",
            state: {
                lureCost: { value: 0 },
            },
            passiveEffects: [
                {
                    op: "SET",
                    target: "self.state.lureCost.value",
                    source: "global.population",
                },
                {
                    op: "MULT",
                    target: "self.state.lureCost.value",
                    value: 30,
                },
                {
                    op: "ADD",
                    target: "self.state.lureCost.value",
                    value: 50,
                },
            ],
        };

        // Population is 2
        const sysWorld = makeSysWorld({ population: 2 });
        const snapshot = makeSnapshot([station, sysWorld]);
        const buffer = makeBuffer();

        system.tick(snapshot, buffer, 16);

        expect(buffer.commands).toEqual([
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "station_outside",
                    key: "lureCost",
                    value: 110,
                },
            },
        ]);
    });

    it("resolves references to other state values", () => {
        const system = new PassiveEffectsSystem();
        const entity = {
            id: "e1",
            state: {
                base: { value: 10 },
                result: { value: 0 },
            },
            passiveEffects: [
                {
                    target: "self.state.result.value",
                    op: "SET",
                    source: "self.state.base.value",
                },
                {
                    target: "self.state.result.value",
                    op: "MULT",
                    value: 2,
                },
            ],
        };
        const snapshot = makeSnapshot([entity]);
        const buffer = makeBuffer();

        system.tick(snapshot, buffer, 16);

        expect(buffer.commands).toEqual([
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "result", value: 20 },
            },
        ]);
    });

    it("emits UPDATE_BODIES_BATCH when mutating flat self.body.* properties", () => {
        const system = new PassiveEffectsSystem();
        const entity = {
            id: "body_e1",
            body: { health: 100 },
            passiveEffects: [
                {
                    target: "self.body.health",
                    op: "SET",
                    value: 42,
                },
            ],
        };
        const snapshot = makeSnapshot([entity]);
        const buffer = makeBuffer();

        system.tick(snapshot, buffer, 16);

        // Strict assertion: length of exactly 1 command of exactly this structure
        expect(buffer.commands).toEqual([
            {
                type: RuntimeCommandType.UPDATE_BODIES_BATCH,
                payload: {
                    updates: [
                        {
                            entityId: "body_e1",
                            health: 42,
                        },
                    ],
                },
            },
        ]);
    });

    it("skips self.body.attributes.* — BodySystem derives attributes", () => {
        const system = new PassiveEffectsSystem();
        const entity = {
            id: "body_e2",
            body: { attributes: { body: 10, mind: 10, social: 10 } },
            passiveEffects: [
                {
                    target: "self.body.attributes.mind",
                    op: "ADD",
                    value: 5,
                },
            ],
        };
        const snapshot = makeSnapshot([entity]);
        const buffer = makeBuffer();

        system.tick(snapshot, buffer, 16);

        // BodySystem is the sole writer of derived attributes;
        // passiveEffects targeting attributes.* are intentionally skipped.
        expect(buffer.commands).toEqual([]);
    });

    it("updating .max does not include value in the payload", () => {
        // Given: an entity whose cycle.value has already been incremented this tick
        const system = new PassiveEffectsSystem();
        const entity = {
            id: "e1",
            state: { cycle: { value: 5, max: 100 } },
            passiveEffects: [
                { target: "self.state.cycle.max", op: "SET", value: 200 },
            ],
        };
        const snapshot = makeSnapshot([entity]);
        const buffer = makeBuffer();

        // When: PassiveEffectsSystem runs
        system.tick(snapshot, buffer, 16);

        // Then: the emitted command updates max but does NOT carry the snapshot's
        // stale value (which would overwrite an ADJUST_STATE applied earlier
        // in the same applyPhase and keep cycle.value permanently at 0)
        expect(buffer.commands).toEqual([
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "cycle", max: 200 },
            },
        ]);
    });
});
