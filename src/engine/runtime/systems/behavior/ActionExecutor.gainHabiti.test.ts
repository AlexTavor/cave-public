import { describe, expect, it } from "vitest";
import { ActionExecutor } from "./ActionExecutor";
import { RuntimeCommandType } from "../../types";
import { buildBehaviorContext, createCommandBuffer } from "./actionExecutorTestUtils";

describe("ActionExecutor gain habiti", () => {
    it("emits a GAIN_HABITI command with behavior metadata", () => {
        const { buffer, commands } = createCommandBuffer();
        new ActionExecutor().execute(
            { type: "GAIN_HABITI", habitusId: "alpha" },
            buildBehaviorContext({ self: { id: "actor" } as any }),
            commands,
        );

        expect(buffer).toEqual([
            {
                type: RuntimeCommandType.GAIN_HABITI,
                payload: { entityId: "sys_world", habitusId: "alpha" },
                metadata: { sourceEntityId: "actor", sourceLane: "behavior_rule" },
            },
        ]);
    });
});