import { describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { handlePointerPickup } from "./pointerSystemActions";

const snapshot = {
    getEntities: () => [
        { id: "sys_world" },
        { id: "body-1", body: { assignmentId: "sys_world" } },
    ],
    getEntity: (id: string) =>
        id === "sys_world"
            ? { id }
            : { id, body: { assignmentId: "sys_world" } },
    getPhysicsBody: (id: string) =>
        id === "body-1" ? { x: 5, y: 0 } : undefined,
};

describe("handlePointerPickup cadence", () => {
    it("respects pickup cadence while the button stays held", () => {
        const commands = { enqueue: vi.fn() };
        handlePointerPickup({
            snapshot: snapshot as any,
            commands: commands as any,
            pointer: { id: "sys_pointer", state: {} } as any,
            pointerX: 0,
            pointerY: 0,
            nowMs: 1000,
            pickupDown: true,
            prevPickupDown: true,
            pickupHoldMs: 250,
            pickupTimerMs: 10,
            pickupRadius: 100,
        });
        expect(
            commands.enqueue.mock.calls.some(
                ([command]) =>
                    command.type === RuntimeCommandType.ASSIGN_BODIES_BATCH,
            ),
        ).toBe(false);
    });
});
