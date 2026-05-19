import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { handleResolvedBodyProcessing } from "./resolveBodyProcessingCommand";

const makeBody = (id: string, x: number, y: number, radius: number) => ({
    id,
    entity: id,
    x,
    y,
    radius,
    mass: 1,
    drag: 0,
    position: { x, y },
    prevPosition: { x, y },
    acceleration: { x: 0, y: 0 },
    isStatic: false,
    velocity: { x: 0, y: 0 },
});

describe("resolveBodyProcessingCommand", () => {
    it("captures the absorbed body's live position in spawned habitus carriers", () => {
        const context = makeHandlerContext();
        const command = {
            type: RuntimeCommandType.RESOLVE_BODY_PROCESSING,
            payload: { nodeId: "node-1", bodyId: "body-1" },
        } as any;

        context.cartridge.config = {
            ...context.cartridge.config,
            habiti: { alpha: {} },
        } as any;
        context.world.add({
            id: "sys_world",
            cave: { ownedHabiti: [] },
            state: {},
        } as any);
        context.world.add({
            id: "body-1",
            body: { habiti: ["alpha"] },
            state: {},
        } as any);
        context.world.add({
            id: "node-1",
            assignment: { assignedIds: ["body-1"] },
            state: {
                processing_absorbs_habiti: { value: true },
                processing_destroys_assigned_bodies: { value: true },
                processing_outputs: { value: [] },
            },
        } as any);
        context.impulseEngine.addBody(makeBody("body-1", 12, 18, 7));

        handleResolvedBodyProcessing(command, context);

        expect(context.commands?.drain()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: RuntimeCommandType.SPAWN_CARRIER,
                    payload: expect.objectContaining({ x: 12, y: 18 }),
                }),
            ]),
        );
    });

    it("adds killed body presentation metadata before removing a destroyed body", () => {
        const context = makeHandlerContext();
        const command = {
            type: RuntimeCommandType.RESOLVE_BODY_PROCESSING,
            payload: { nodeId: "node-1", bodyId: "body-1" },
        } as any;

        context.world.add({ id: "sys_world", state: {} } as any);
        context.world.add({ id: "body-1", body: {}, state: {} } as any);
        context.world.add({
            id: "node-1",
            assignment: { assignedIds: ["body-1"] },
            state: {
                processing_destroys_assigned_bodies: { value: true },
                processing_outputs: { value: [] },
            },
        } as any);
        context.impulseEngine.addBody(makeBody("body-1", 12, 18, 7));

        handleResolvedBodyProcessing(command, context);

        expect(command.metadata?.killedEntityPresentations).toEqual([
            { entityId: "body-1", x: 12, y: 18, radius: 7 },
        ]);
        expect(
            context.world.entities.find((entity) => entity.id === "body-1"),
        ).toBeUndefined();
    });
});
