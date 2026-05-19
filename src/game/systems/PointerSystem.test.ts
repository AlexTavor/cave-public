import { describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { PointerSystem } from "./PointerSystem";

const readUpdate = (calls: Array<[any]>, key: string) =>
    calls.find(
        ([command]) =>
            command.type === RuntimeCommandType.UPDATE_STATE &&
            command.payload.key === key,
    )?.[0]?.payload.value;

describe("PointerSystem", () => {
    it("derives hold and cadence timing from wall clock and runs when paused", () => {
        vi.useFakeTimers();
        vi.setSystemTime(1300);
        const commands = { enqueue: vi.fn() } as any;
        const pointer = {
            id: "sys_pointer",
            assignment: { assignedIds: [] },
            state: {
                pointer_pickup_down: { value: true },
                pointer_drop_down: { value: true },
                pointer_prev_pickup_down: { value: true },
                pointer_prev_drop_down: { value: true },
                pointer_pickup_started_at_ms: { value: 1000 },
                pointer_drop_started_at_ms: { value: 900 },
                pointer_pickup_last_at_ms: { value: 1100 },
            },
        };
        const snapshot = {
            getEntities: () => [pointer, { id: "sys_world" }],
            getEntity: (id: string) =>
                id === "sys_pointer" ? pointer : { id },
            getPhysicsBody: (id: string) =>
                id === "sys_pointer" ? { x: 0, y: 0 } : undefined,
        };

        const system = new PointerSystem();
        system.tick(snapshot as any, commands, 0);

        expect(system.runsWhenPaused).toBe(true);
        expect(
            readUpdate(commands.enqueue.mock.calls, "pointer_pickup_hold_ms"),
        ).toBe(300);
        expect(
            readUpdate(commands.enqueue.mock.calls, "pointer_drop_hold_ms"),
        ).toBe(400);
        expect(
            readUpdate(commands.enqueue.mock.calls, "pointer_pickup_timer_ms"),
        ).toBe(200);
        vi.useRealTimers();
    });
});
