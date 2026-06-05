import { describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../runtime/types";
import { EntityDragController } from "./entityDragController";
import { createRuntime, createScene } from "./entityDragController.testUtils";

describe("EntityDragController non-body drag", () => {
    it("drags non-body entities without pointer assignment", () => {
        const runtime = createRuntime({
            entities: [
                { id: "sys_pointer", assignment: { assignedIds: [] } },
                {
                    id: "node-1",
                    assignment: { assignedIds: [] },
                    powerSink: {},
                },
            ],
            physics: { "node-1": { x: 10, y: 20 } },
        });
        const controller = new EntityDragController(
            createScene(),
            () => runtime as any,
            vi.fn(),
            () => ({ valid: false as const }),
        );

        (controller as any).onObjectDown(
            { worldX: 3, worldY: 4, button: 0 },
            { getData: () => "node-1" },
        );
        (controller as any).onPointerMove({
            isDown: true,
            worldX: 8,
            worldY: 14,
        });

        expect(runtime.queued).toContainEqual({
            type: RuntimeCommandType.POSITION_ENTITY,
            payload: { id: "node-1", x: 15, y: 30 },
        });
        expect(
            runtime.queued.some(
                (command: any) =>
                    command.type === RuntimeCommandType.ASSIGN_BODIES_BATCH,
            ),
        ).toBe(false);
    });
});
