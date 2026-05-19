import { describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { handlePointerDrop } from "./pointerSystemActions";

const runDrop = (nextBodyId: string | null) => {
    const commands = { enqueue: vi.fn() } as any;
    handlePointerDrop({
        commands,
        carriedBodies: [{ id: "body-1" }] as any,
        targetId: "node-1",
        targetKind: "processing",
        nextBodyId,
        prevDropDown: true,
        dropDown: false,
        dropHoldMs: 10,
        longDropMs: 260,
    });
    const calls = commands.enqueue.mock.calls as Array<[any]>;
    return calls.map((call) => call[0]);
};

describe("handlePointerDrop short drop", () => {
    it("does nothing when there is no valid next body", () => {
        expect(
            runDrop(null).some(
                (command: any) =>
                    command.type === RuntimeCommandType.ASSIGN_BODIES_BATCH,
            ),
        ).toBe(false);
    });

    it("drops the exact next body chosen by PointerSystem", () => {
        expect(runDrop("body-9")).toContainEqual({
            type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
            payload: { updates: [{ bodyId: "body-9", ownerId: "node-1" }] },
        });
    });
});
