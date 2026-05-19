import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { syncPendingHabiti } from "./processingPendingHabiti";

describe("processingPendingHabiti multiple discovery", () => {
    it("emits one transit pickup sequence per newly discovered habitus", () => {
        const context = makeHandlerContext();
        context.cartridge.config = {
            ...context.cartridge.config,
            habiti: { alpha: {}, beta: {} },
        } as any;
        const world = {
            id: "sys_world",
            cave: { ownedHabiti: [] },
        } as any;
        const node = {
            id: "node-1",
            state: { processing_absorbs_habiti: { value: true } },
        } as any;
        const body = {
            id: "body-1",
            body: { habiti: ["alpha", "beta"] },
            physics: { x: 4, y: 8 },
        } as any;
        context.world.add(world);
        context.world.add(node);
        context.world.add(body);

        syncPendingHabiti(context, world, node, body);

        const emitted = context.commands?.drain() ?? [];
        const spawns = emitted.filter(
            (command) => command.type === RuntimeCommandType.SPAWN_CARRIER,
        );

        expect(spawns).toHaveLength(2);
        expect(spawns).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: RuntimeCommandType.SPAWN_CARRIER,
                    payload: {
                        x: 4,
                        y: 8,
                        tags: [
                            "carrier",
                            "carrier:habiti",
                            "carrier:habiti:alpha",
                        ],
                        commands: [
                            { type: "GAIN_HABITI", habitusId: "alpha" },
                            { type: "KILL", entityId: "self" },
                        ],
                    },
                }),
                expect.objectContaining({
                    type: RuntimeCommandType.SPAWN_CARRIER,
                    payload: {
                        x: 4,
                        y: 8,
                        tags: [
                            "carrier",
                            "carrier:habiti",
                            "carrier:habiti:beta",
                        ],
                        commands: [
                            { type: "GAIN_HABITI", habitusId: "beta" },
                            { type: "KILL", entityId: "self" },
                        ],
                    },
                }),
            ]),
        );
        expect(
            emitted.some(
                (command) =>
                    command.type === RuntimeCommandType.POSITION_ENTITY,
            ),
        ).toBe(false);
        expect(
            emitted.some(
                (command) =>
                    command.type === RuntimeCommandType.SET_PHYSICS_LAYER &&
                    command.payload.layer === "phantom",
            ),
        ).toBe(false);
    });
});
