import { describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { handlePointerPickup } from "./pointerSystemActions";

const makeBody = (id: string, ownerId: string, status = "orbiting") => ({
    id,
    body: { assignmentId: ownerId, assignmentStatus: status, attributes: {} },
});
const makeSnapshot = (
    entities: any[],
    physics: Record<string, { x: number; y: number }>,
) => ({
    getEntities: () => entities,
    getEntity: (id: string) => entities.find((entity) => entity.id === id),
    getPhysicsBody: (id: string) => physics[id],
});
const runPickup = (
    entities: any[],
    physics: Record<string, { x: number; y: number }>,
    overrides = {},
) => {
    const commands = { enqueue: vi.fn() };
    handlePointerPickup({
        snapshot: makeSnapshot(entities, physics) as any,
        commands: commands as any,
        pointer: { id: "sys_pointer", state: {} } as any,
        pointerX: 0,
        pointerY: 0,
        nowMs: 1000,
        pickupDown: true,
        prevPickupDown: false,
        pickupHoldMs: 0,
        pickupTimerMs: 1000,
        pickupRadius: 100,
        ...overrides,
    });
    return commands.enqueue.mock.calls;
};

describe("handlePointerPickup", () => {
    it.each([
        { id: "sys_world" },
        { id: "power-1", assignment: { assignedIds: [] }, powerSink: {} },
        {
            id: "processor-1",
            assignment: { assignedIds: [] },
            state: { assignment_duration: { value: 10 } },
        },
    ])("picks the nearest orbiting body from eligible owners", (owner) => {
        const calls = runPickup(
            [owner, makeBody("near", owner.id), makeBody("far", owner.id)],
            { near: { x: 10, y: 0 }, far: { x: 40, y: 0 } },
        );
        expect(
            calls.find(
                ([command]) =>
                    command.type === RuntimeCommandType.ASSIGN_BODIES_BATCH,
            )?.[0],
        ).toEqual({
            type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
            payload: { updates: [{ bodyId: "near", ownerId: "sys_pointer" }] },
        });
    });

    it("ignores pointer-owned bodies but allows navigating ones", () => {
        const calls = runPickup(
            [
                { id: "sys_world" },
                { id: "sys_pointer" },
                makeBody("pointer", "sys_pointer"),
                makeBody("moving", "sys_world", "navigating"),
                makeBody("orbiting", "sys_world"),
            ],
            {
                pointer: { x: 0, y: 0 },
                moving: { x: 2, y: 0 },
                orbiting: { x: 3, y: 0 },
            },
        );
        expect(
            calls.find(
                ([command]) =>
                    command.type === RuntimeCommandType.ASSIGN_BODIES_BATCH,
            )?.[0]?.payload.updates,
        ).toEqual([{ bodyId: "moving", ownerId: "sys_pointer" }]);
    });

    it("uses distance-first ordering with id as the tie-breaker", () => {
        const calls = runPickup(
            [
                { id: "sys_world" },
                makeBody("b-body", "sys_world"),
                makeBody("a-body", "sys_world"),
            ],
            { "a-body": { x: 10, y: 0 }, "b-body": { x: 10, y: 0 } },
        );
        expect(
            calls.filter(
                ([command]) =>
                    command.type === RuntimeCommandType.ASSIGN_BODIES_BATCH,
            ),
        ).toHaveLength(1);
        expect(
            calls.find(
                ([command]) =>
                    command.type === RuntimeCommandType.ASSIGN_BODIES_BATCH,
            )?.[0]?.payload.updates[0].bodyId,
        ).toBe("a-body");
    });
});
