import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { syncPendingHabiti } from "./processingPendingHabiti";

const makeEntities = () => ({
    world: {
        id: "sys_world",
        cave: { ownedHabiti: [] },
        state: {},
    } as any,
    node: {
        id: "node-1",
        state: { processing_absorbs_habiti: { value: true } },
    } as any,
    body: {
        id: "body-1",
        body: { habiti: ["alpha"] },
        physics: { x: 12, y: 16, radius: 8 },
    } as any,
});

const makeContext = () => {
    const context = makeHandlerContext();
    context.cartridge.config = {
        ...context.cartridge.config,
        habiti: { alpha: {} },
    } as any;
    return context;
};

describe("processingPendingHabiti", () => {
    it("spawns discovered habiti as carriers with gain and kill payloads", () => {
        const context = makeContext();
        const { world, node, body } = makeEntities();
        context.world.add(world);
        context.world.add(node);
        context.world.add(body);

        syncPendingHabiti(context, world, node, body);

        const emitted = context.commands?.drain() ?? [];
        expect(emitted).toEqual(
            expect.arrayContaining([
                {
                    type: RuntimeCommandType.SPAWN_CARRIER,
                    payload: {
                        x: 12,
                        y: 16,
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
                    metadata: {
                        sourceEntityId: "body-1",
                        sourceLane: "behavior_rule",
                    },
                },
            ]),
        );
        expect(
            emitted.some(
                (command) =>
                    command.type === RuntimeCommandType.POSITION_ENTITY,
            ),
        ).toBe(false);
    });

    it("does not emit a duplicate carrier when the same habitus carrier already exists", () => {
        const context = makeContext();
        const { world, node, body } = makeEntities();
        context.world.add(world);
        context.world.add(node);
        context.world.add(body);
        context.world.add({
            id: "carrier-1",
            carrier: {
                commands: [{ type: "GAIN_HABITI", habitusId: "alpha" }],
            },
        } as any);

        syncPendingHabiti(context, world, node, body);

        expect(
            (context.commands?.drain() ?? []).some(
                (command) => command.type === RuntimeCommandType.SPAWN_CARRIER,
            ),
        ).toBe(false);
    });
});
