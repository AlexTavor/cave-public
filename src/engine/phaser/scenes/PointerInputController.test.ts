import { describe, expect, it, vi } from "vitest";
import type Phaser from "phaser";
import { RuntimeCommandType } from "../../runtime/types";
import { PointerInputController } from "./PointerInputController";

const createScene = () =>
    ({
        cameras: { main: {} },
        input: {
            mouse: { disableContextMenu: vi.fn() },
            on: vi.fn(),
            off: vi.fn(),
        },
    }) as unknown as Phaser.Scene;

describe("PointerInputController", () => {
    it("writes pointer timestamps and single-steps paused runtimes", () => {
        vi.useFakeTimers();
        vi.setSystemTime(1500);
        const queued: unknown[] = [];
        const runtime = {
            commands: { enqueue: (command: unknown) => queued.push(command) },
            flushCommands: vi.fn(),
            stepOncePreservingPause: vi.fn(() => 1),
            getState: () => ({ status: "paused" as const }),
            getEntity: () => ({ assignment: { assignedIds: ["body-1"] } }),
        };
        const controller = new PointerInputController(
            createScene(),
            () => runtime as any,
        );
        const pointer = {
            button: 2,
            worldX: 3,
            worldY: 4,
            updateWorldPoint: vi.fn(),
        };

        (controller as any).onPointerDown(pointer);
        (controller as any).onPointerUp(pointer);

        expect(runtime.stepOncePreservingPause).toHaveBeenCalledTimes(2);
        expect(runtime.flushCommands).not.toHaveBeenCalled();
        expect(queued).toContainEqual({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: "sys_pointer",
                key: "pointer_pickup_started_at_ms",
                value: 1500,
                visible: false,
            },
        });
        expect(queued).toContainEqual({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: "sys_pointer",
                key: "pointer_pickup_started_at_ms",
                value: 0,
                visible: false,
            },
        });
        vi.useRealTimers();
    });
});
