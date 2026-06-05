import { describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../runtime/types";
import { EntityDragController } from "./entityDragController";
import { createRuntime, createScene } from "./entityDragController.testUtils";

describe("EntityDragController", () => {
    it("flushes paused position drags without using anchor updates", () => {
        const runtime = createRuntime({
            entities: [
                { id: "sys_pointer", assignment: { assignedIds: [] } },
                { id: "hero", body: { assignmentId: "sys_world" } },
            ],
            physics: { hero: { x: 10, y: 20 } },
        });
        const controller = new EntityDragController(
            createScene(),
            () => runtime as any,
            vi.fn(),
            () => ({ valid: false as const }),
        );

        (controller as any).onObjectDown(
            { worldX: 3, worldY: 4 },
            { getData: () => "hero" },
        );
        (controller as any).onPointerMove({
            isDown: true,
            worldX: 8,
            worldY: 14,
        });

        expect(runtime.flushCommands).toHaveBeenCalledTimes(2);
        expect(runtime.queued[0]).toEqual({
            type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
            payload: { updates: [{ bodyId: "hero", ownerId: "sys_pointer" }] },
        });
        expect(runtime.queued).toContainEqual({
            type: RuntimeCommandType.POSITION_ENTITY,
            payload: { id: "hero", x: 15, y: 30 },
        });
        expect(
            runtime.queued.some(
                (command: any) => command.type === RuntimeCommandType.KILL,
            ),
        ).toBe(false);
    });

    it("single-steps on drag release and never starts dragging sys_world", () => {
        const runtime = createRuntime({
            entities: [
                { id: "sys_pointer", assignment: { assignedIds: [] } },
                { id: "hero", body: { assignmentId: "sys_world" } },
            ],
            physics: { hero: { x: 10, y: 20 }, sys_pointer: { x: 0, y: 0 } },
        });
        const controller = new EntityDragController(
            createScene(),
            () => runtime as any,
            vi.fn(),
            () => ({ valid: false as const }),
        );

        (controller as any).onObjectDown(
            { worldX: 0, worldY: 0 },
            { getData: () => "sys_world" },
        );
        (controller as any).onPointerUp();
        expect(runtime.stepOncePreservingPause).not.toHaveBeenCalled();

        (controller as any).onObjectDown(
            { worldX: 3, worldY: 4 },
            { getData: () => "hero" },
        );
        (controller as any).onPointerUp({ worldX: 0, worldY: 0 });

        expect(runtime.stepOncePreservingPause).toHaveBeenCalledTimes(1);
        expect(runtime.queued.slice(-2)).toEqual([
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "sys_world",
                    key: "cave_drag_active",
                    value: false,
                },
            },
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "sys_world",
                    key: "cave_drag_entity_id",
                    value: "",
                },
            },
        ]);
    });
});
