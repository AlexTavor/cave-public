import { describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../runtime/types";
import { EntityDragController } from "./entityDragController";
import { createRuntime, createScene } from "./entityDragController.testUtils";

describe("EntityDragController drag assignment", () => {
    it("assigns the dragged body to sys_pointer on drag start", () => {
        const runtime = createRuntime({
            entities: [
                { id: "sys_pointer", assignment: { assignedIds: [] } },
                { id: "body-1", body: { assignmentId: "origin-node" } },
            ],
            physics: { "body-1": { x: 10, y: 20 } },
        });
        const controller = new EntityDragController(
            createScene(),
            () => runtime as any,
            vi.fn(),
            () => ({ valid: false as const }),
        );

        (controller as any).onObjectDown(
            { worldX: 3, worldY: 4, button: 0 },
            { getData: () => "body-1" },
        );

        expect(runtime.queued[0]).toEqual({
            type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
            payload: {
                updates: [{ bodyId: "body-1", ownerId: "sys_pointer" }],
            },
        });
    });

    it("drops the dragged body onto the nearest valid target", () => {
        const runtime = createRuntime({
            entities: [
                {
                    id: "sys_pointer",
                    assignment: { assignedIds: [] },
                    state: { pointer_connection_radius: { value: 20 } },
                },
                { id: "body-1", body: { assignmentId: "origin-node" } },
                {
                    id: "target-node",
                    assignment: { assignedIds: [] },
                    powerSink: {},
                },
            ],
            physics: {
                "body-1": { x: 10, y: 20 },
                "target-node": { x: 12, y: 10 },
                sys_pointer: { x: 0, y: 0 },
            },
        });
        const controller = new EntityDragController(
            createScene(),
            () => runtime as any,
            vi.fn(),
            // Resolution is unit-tested in game's resolveDraggedBodyDropTarget
            // test; stub a valid target here to cover the engine forward path.
            () => ({ valid: true as const, ownerId: "target-node" }),
        );

        (controller as any).onObjectDown(
            { worldX: 3, worldY: 4, button: 0 },
            { getData: () => "body-1" },
        );
        (controller as any).onPointerUp({ worldX: 10, worldY: 10 });

        expect(runtime.queued).toContainEqual({
            type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
            payload: {
                updates: [{ bodyId: "body-1", ownerId: "target-node" }],
            },
        });
    });

    it("restores the dragged body to its origin when no valid target exists", () => {
        const runtime = createRuntime({
            entities: [
                {
                    id: "sys_pointer",
                    assignment: { assignedIds: [] },
                    state: { pointer_connection_radius: { value: 10 } },
                },
                { id: "body-1", body: { assignmentId: "origin-node" } },
            ],
            physics: {
                "body-1": { x: 10, y: 20 },
                sys_pointer: { x: 100, y: 100 },
            },
        });
        const controller = new EntityDragController(
            createScene(),
            () => runtime as any,
            vi.fn(),
            () => ({ valid: false as const }),
        );

        (controller as any).onObjectDown(
            { worldX: 3, worldY: 4, button: 0 },
            { getData: () => "body-1" },
        );
        (controller as any).onPointerUp();

        expect(runtime.queued).toContainEqual({
            type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
            payload: {
                updates: [
                    {
                        bodyId: "body-1",
                        ownerId: "origin-node",
                        mode: "drag_restore",
                        expectedCurrentOwnerId: "sys_pointer",
                    },
                ],
            },
        });
    });
});
