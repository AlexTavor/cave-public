import { describe, expect, it } from "vitest";
import { ActionExecutor } from "./ActionExecutor";
import { RuntimeCommandType } from "../../types";
import { createCommandBuffer } from "./actionExecutorTestUtils";

describe("ActionExecutor spawn carrier", () => {
    it("emits SPAWN_CARRIER with the source body position", () => {
        const { buffer, commands } = createCommandBuffer();
        new ActionExecutor().execute(
            { type: "SPAWN_CARRIER", tags: ["carrier"], commands: [{ type: "KILL", entityId: "self" }] },
            {
                self: { id: "actor" } as any,
                globals: {},
                sourceLane: "behavior_rule",
                snapshot: { getPhysicsBody: () => ({ position: { x: 3, y: 5 } }) } as any,
            } as any,
            commands,
        );

        expect(buffer[0]).toMatchObject({
            type: RuntimeCommandType.SPAWN_CARRIER,
            payload: { tags: ["carrier"], x: 3, y: 5 },
            metadata: { sourceEntityId: "actor", sourceLane: "behavior_rule" },
        });
    });
});