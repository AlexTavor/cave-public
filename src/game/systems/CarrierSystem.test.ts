import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { CarrierSystem } from "./CarrierSystem";
import { createCommandBuffer } from "./testUtils";

const makeSnapshot = (entities: any[], bodies: Record<string, any>) =>
    new Snapshot(entities, { getBody: (id: string) => bodies[id] } as any, {});

describe("CarrierSystem", () => {
    it("targets traveling carriers and orbits arrived carriers", () => {
        const { buffer, commands } = createCommandBuffer();
        new CarrierSystem().tick(
            makeSnapshot(
                [
                    { id: "travel", carrier: { commands: [] }, state: {} },
                    {
                        id: "orbit",
                        carrier: { commands: [] },
                        state: { carrier_arrived: { value: 1 } },
                    },
                    { id: "sys_world" },
                ],
                {
                    sys_world: { x: 0, y: 0, radius: 100 },
                    travel: { x: 300, y: 0, radius: 12, layer: "default" },
                    orbit: {
                        x: 120,
                        y: 0,
                        radius: 12,
                        layer: "default",
                        targetId: "sys_world",
                    },
                },
            ),
            commands as any,
            16,
        );

        expect(buffer).toContainEqual({
            type: RuntimeCommandType.SET_TARGET,
            payload: { entityId: "travel", targetId: "sys_world" },
        });
        expect(buffer).toContainEqual({
            type: RuntimeCommandType.SET_PHYSICS_LAYER,
            payload: { entityId: "orbit", layer: "phantom" },
        });
        expect(
            buffer.some(
                (command) =>
                    command.type === RuntimeCommandType.POSITION_ENTITY,
            ),
        ).toBe(true);
    });

    it("marks newly arrived carriers without orbiting them in the same tick", () => {
        const { buffer, commands } = createCommandBuffer();
        new CarrierSystem().tick(
            makeSnapshot(
                [
                    { id: "carrier-1", carrier: { commands: [] }, state: {} },
                    { id: "sys_world" },
                ],
                {
                    sys_world: { x: 0, y: 0, radius: 100 },
                    "carrier-1": { x: 90, y: 0, radius: 12, layer: "default" },
                },
            ),
            commands as any,
            16,
        );

        expect(buffer).toContainEqual({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: "carrier-1",
                key: "carrier_arrived",
                value: 1,
                visible: false,
            },
        });
        expect(
            buffer.some(
                (command) =>
                    command.type === RuntimeCommandType.POSITION_ENTITY &&
                    command.payload.id === "carrier-1",
            ),
        ).toBe(false);
    });

    it("re-enqueues SPAWN_CARRIER when a live carrier body is missing", () => {
        const { buffer, commands } = createCommandBuffer();
        new CarrierSystem().tick(
            makeSnapshot(
                [
                    {
                        id: "carrier-1",
                        tags: ["carrier"],
                        physics: { x: 2, y: 4 },
                        carrier: {
                            commands: [{ type: "KILL", entityId: "self" }],
                        },
                    },
                    { id: "sys_world" },
                ],
                { sys_world: { x: 0, y: 0, radius: 100 } },
            ),
            commands as any,
            16,
        );

        expect(buffer).toContainEqual({
            type: RuntimeCommandType.SPAWN_CARRIER,
            payload: {
                id: "carrier-1",
                x: 2,
                y: 4,
                arrived: false,
                tags: ["carrier"],
                commands: [{ type: "KILL", entityId: "self" }],
            },
        });
    });
});
