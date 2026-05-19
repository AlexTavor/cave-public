import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { ResolveBodyProcessingHandler } from "./ResolveBodyProcessingHandler";

const makePhysics = (x: number) => ({ x, y: 0, radius: 10, mass: 1, drag: 0 });
const getPendingTransfers = (context: ReturnType<typeof makeHandlerContext>) =>
    context.world.entities.filter((entity) =>
        entity.tags?.includes("pending_transfer"),
    );

describe("ResolveBodyProcessingHandler", () => {
    it("routes self-targeted outputs back to the processing node", () => {
        const context = makeHandlerContext();
        context.world.add({
            id: "sys_world",
            state: {},
            physics: makePhysics(0),
        } as any);
        context.world.add({
            id: "body-1",
            body: {},
            physics: makePhysics(30),
        } as any);
        context.world.add({
            id: "node-1",
            assignment: { assignedIds: ["body-1"] },
            state: {
                processing_outputs: {
                    value: [
                        {
                            resource: "food",
                            source: "fixed",
                            factor: 3,
                            target: "self",
                        },
                    ],
                },
            },
            physics: makePhysics(10),
        } as any);

        new ResolveBodyProcessingHandler().handle(
            {
                type: RuntimeCommandType.RESOLVE_BODY_PROCESSING,
                payload: { nodeId: "node-1", bodyId: "body-1" },
            } as any,
            context,
        );

        expect(
            getPendingTransfers(context).every(
                (entity: any) => entity.transfer?.targetId === "node-1",
            ),
        ).toBe(true);
        expect(
            (
                context.world.entities.find(
                    (entity) => entity.id === "node-1",
                ) as any
            ).ledger.incoming.food,
        ).toBe(3);
    });

    it("keeps explicit output targets by runtime id", () => {
        const context = makeHandlerContext();
        context.world.add({
            id: "sys_world",
            state: {},
            physics: makePhysics(0),
        } as any);
        context.world.add({
            id: "target-1",
            state: {},
            physics: makePhysics(60),
        } as any);
        context.world.add({
            id: "body-1",
            body: {},
            physics: makePhysics(30),
        } as any);
        context.world.add({
            id: "node-1",
            assignment: { assignedIds: ["body-1"] },
            state: {
                processing_outputs: {
                    value: [
                        {
                            resource: "heat",
                            source: "fixed",
                            factor: 2,
                            target: "target-1",
                        },
                    ],
                },
            },
            physics: makePhysics(10),
        } as any);

        new ResolveBodyProcessingHandler().handle(
            {
                type: RuntimeCommandType.RESOLVE_BODY_PROCESSING,
                payload: { nodeId: "node-1", bodyId: "body-1" },
            } as any,
            context,
        );

        expect(
            getPendingTransfers(context).every(
                (entity: any) => entity.transfer?.targetId === "target-1",
            ),
        ).toBe(true);
    });

    it("skips spectacle creation for missing targets and still finalizes processing", () => {
        const context = makeHandlerContext();
        context.world.add({
            id: "sys_world",
            state: {},
            physics: makePhysics(0),
        } as any);
        context.world.add({
            id: "body-1",
            body: {},
            physics: makePhysics(30),
        } as any);
        context.world.add({
            id: "node-1",
            assignment: { assignedIds: ["body-1"] },
            state: {
                processing_outputs: {
                    value: [
                        {
                            resource: "food",
                            source: "fixed",
                            target: "missing",
                        },
                    ],
                },
            },
            physics: makePhysics(10),
        } as any);

        new ResolveBodyProcessingHandler().handle(
            {
                type: RuntimeCommandType.RESOLVE_BODY_PROCESSING,
                payload: { nodeId: "node-1", bodyId: "body-1" },
            } as any,
            context,
        );

        expect(getPendingTransfers(context)).toHaveLength(0);
        expect(
            (
                context.world.entities.find(
                    (entity) => entity.id === "node-1",
                ) as any
            ).assignment.assignedIds,
        ).toEqual([]);
        const queuedCommands = context.commands?.drain() ?? [];
        expect(queuedCommands).toContainEqual({
            type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
            payload: { updates: [{ bodyId: "body-1", ownerId: "sys_world" }] },
        });
    });
});
